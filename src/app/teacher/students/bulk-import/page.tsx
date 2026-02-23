"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft, Upload, FileText, CheckCircle2, XCircle,
    Download, Loader2, AlertCircle, Users, Info, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

interface ParsedStudent {
    name: string;
    studentNumber: string;
    email?: string;
    department?: string;
    className?: string;
    gender?: string;
    clubsJoined?: string;
    photoUrl?: string;
    photoFile?: File; // ZIP에서 추출한 이미지 파일
}

interface ImportResult {
    name: string;
    email: string;
    password: string;
    studentNumber: string;
    userId?: string; // 사용자 ID 추가
    success: boolean;
    error?: string;
}

const CSV_TEMPLATE = `이름,학번,이메일,학과,반,성별,동아리,사진파일명
김철수,20240001,,컴퓨터공학과,1반,남,컴퓨터부,20240001.jpg
이영희,20240002,,정보보안과,2반,여,보안부,20240002.png
박민준,20240003,student003@school.kr,소프트웨어공학과,1반,남,프로그래밍부,20240003.jpg`;

export default function BulkImportPage() {
    const router = useRouter();
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const zipInputRef = useRef<HTMLInputElement>(null);

    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [selectedClassroom, setSelectedClassroom] = useState("");
    const [csvText, setCsvText] = useState("");
    const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [results, setResults] = useState<ImportResult[] | null>(null);
    const [step, setStep] = useState<"input" | "preview" | "done">("input");
    const [imageFiles, setImageFiles] = useState<Map<string, File>>(new Map()); // 파일명 -> File 객체

    useEffect(() => {
        async function loadClassrooms() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from("classrooms")
                .select("id, name, grade, class_number")
                .eq("teacher_id", user.id)
                .eq("is_active", true)
                .order("created_at", { ascending: false });

            setClassrooms(data || []);
            if (data && data.length > 0) setSelectedClassroom(data[0].id);
        }
        loadClassrooms();
    }, []);

    // CSV 파싱
    const parseCSV = (text: string): { students: ParsedStudent[]; error: string | null } => {
        const lines = text.trim().split("\n").filter((l) => l.trim());
        if (lines.length === 0) return { students: [], error: "내용이 비어 있습니다." };

        const students: ParsedStudent[] = [];
        const errors: string[] = [];

        // 헤더 행 여부 및 컬럼 순서 자동 감지
        const firstLineLower = lines[0].toLowerCase();
        const hasHeader =
            firstLineLower.includes("이름") ||
            firstLineLower.includes("name") ||
            firstLineLower.includes("student_number") ||
            firstLineLower.includes("학번");

        const startIdx = hasHeader ? 1 : 0;

        // 헤더 기반 컬럼 인덱스 결정
        let nameIdx = -1, snIdx = -1, emailIdx = -1, deptIdx = -1, classIdx = -1, genIdx = -1, clubIdx = -1, photoIdx = -1;

        if (hasHeader) {
            const headerCols = lines[0].split(",").map((c) => c.trim().toLowerCase());
            const findIdx = (keys: string[]) => headerCols.findIndex(c => keys.some(k => c.includes(k)));

            snIdx = findIdx(["student_number", "학번"]);
            nameIdx = findIdx(["name", "이름"]);
            emailIdx = findIdx(["email", "이메일"]);
            deptIdx = findIdx(["department", "학과"]);
            classIdx = findIdx(["class_name", "반", "class_number"]);
            genIdx = findIdx(["gender", "성별"]);
            clubIdx = findIdx(["club", "동아리"]);
            photoIdx = findIdx(["photo", "사진"]);
        } else {
            // 기본 순서: 이름, 학번, ...
            nameIdx = 0;
            snIdx = 1;
        }

        // 학번과 이름 컬럼은 필수
        if (snIdx === -1) snIdx = 0; // Fallback
        if (nameIdx === -1) nameIdx = 1; // Fallback

        for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i].trim();
            // 쉼표로 분리 (따옴표 처리)
            let cols = splitCSVLine(line);

            const studentNumber = cols[snIdx] || "";
            const name = cols[nameIdx] || "";
            const email = emailIdx >= 0 ? cols[emailIdx] : undefined;
            const department = deptIdx >= 0 ? cols[deptIdx] : undefined;
            const className = classIdx >= 0 ? cols[classIdx] : undefined;
            const gender = genIdx >= 0 ? cols[genIdx] : undefined;
            const clubsJoined = clubIdx >= 0 ? cols[clubIdx] : undefined;
            const photoFileName = photoIdx >= 0 ? cols[photoIdx] : undefined;

            if (!name) {
                errors.push(`${i + 1}행: 이름이 없습니다.`);
                continue;
            }
            if (!studentNumber) {
                errors.push(`${i + 1}행: 학번이 없습니다.`);
                continue;
            }

            // 이미지 파일 찾기 (ZIP에서 추출한 파일 또는 URL)
            let photoUrl: string | undefined = undefined;
            let photoFile: File | undefined = undefined;

            if (photoFileName) {
                // URL인지 확인 (http:// 또는 https://로 시작)
                if (photoFileName.startsWith('http://') || photoFileName.startsWith('https://')) {
                    photoUrl = photoFileName;
                } else {
                    // 파일명인 경우 imageFiles에서 찾기
                    const file = imageFiles.get(photoFileName.trim());
                    if (file) {
                        photoFile = file;
                    } else {
                        // 파일을 찾지 못한 경우 경고만 표시 (필수는 아님)
                        console.warn(`이미지 파일을 찾을 수 없습니다: ${photoFileName}`);
                    }
                }
            }

            students.push({
                name,
                studentNumber,
                email: email || undefined,
                department,
                className,
                gender,
                clubsJoined,
                photoUrl,
                photoFile
            });
        }

        if (errors.length > 0) return { students, error: errors.join(" | ") };
        return { students, error: null };
    };

    // 쉼표로 분리 (따옴표 내부의 쉼표는 무시)
    const splitCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') inQuotes = !inQuotes;
            else if (ch === "," && !inQuotes) {
                result.push(current.replace(/^"|"$/g, "").trim());
                current = "";
            } else current += ch;
        }
        result.push(current.replace(/^"|"$/g, "").trim());
        return result;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
            toast.error("CSV 또는 TXT 파일만 업로드할 수 있습니다.");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const buffer = ev.target?.result as ArrayBuffer;

            // Try UTF-8 first
            const utf8Decoder = new TextDecoder("utf-8");
            let text = utf8Decoder.decode(buffer);

            // If it clearly contains garbled text (common in Korean EUC-KR files), try EUC-KR
            if (text.includes("") || (!text.includes("이름") && !text.includes("학번"))) {
                try {
                    const euckrDecoder = new TextDecoder("euc-kr");
                    text = euckrDecoder.decode(buffer);
                } catch (e) {
                    console.error("EUC-KR decoding failed", e);
                }
            }

            setCsvText(text);
        };
        reader.readAsArrayBuffer(file);
    };

    // ZIP 파일 처리
    const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".zip")) {
            toast.error("ZIP 파일만 업로드할 수 있습니다.");
            return;
        }

        try {
            toast.loading("ZIP 파일을 처리하는 중...");
            const zip = new JSZip();
            const zipData = await zip.loadAsync(file);
            
            let csvContent = "";
            const imageMap = new Map<string, File>();

            // ZIP 파일 내 모든 파일 처리
            for (const [fileName, zipEntry] of Object.entries(zipData.files)) {
                // 디렉토리는 건너뛰기
                if (zipEntry.dir) continue;

                const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
                
                // CSV 파일 찾기
                if (fileExtension === 'csv' || fileExtension === 'txt') {
                    const content = await zipEntry.async('string');
                    csvContent = content;
                }
                // 이미지 파일 찾기 (jpg, jpeg, png, gif, webp)
                else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
                    const blob = await zipEntry.async('blob');
                    const imageFile = new File([blob], fileName.split('/').pop() || fileName, {
                        type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`
                    });
                    // 파일명만 저장 (경로 제거)
                    const simpleFileName = fileName.split('/').pop() || fileName;
                    imageMap.set(simpleFileName, imageFile);
                }
            }

            if (!csvContent) {
                toast.error("ZIP 파일에 CSV 파일을 찾을 수 없습니다.");
                return;
            }

            setCsvText(csvContent);
            setImageFiles(imageMap);
            
            if (imageMap.size > 0) {
                toast.success(`CSV 파일과 ${imageMap.size}개의 이미지 파일을 찾았습니다.`);
            } else {
                toast.success("CSV 파일을 찾았습니다. (이미지 파일 없음)");
            }
        } catch (err: any) {
            toast.error(`ZIP 파일 처리 실패: ${err.message}`);
            console.error(err);
        }
    };

    const handlePreview = () => {
        if (!csvText.trim()) {
            setParseError("학생 데이터를 입력해주세요.");
            return;
        }
        if (!selectedClassroom) {
            setParseError("학급을 선택해주세요.");
            return;
        }

        const { students, error } = parseCSV(csvText);
        setParseError(error);
        setParsedStudents(students);

        if (students.length > 0) {
            setStep("preview");
        }
    };

    // 이미지 업로드 함수
    const uploadImage = async (file: File, userId: string): Promise<string | null> => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', userId);

            const res = await fetch('/api/teacher/upload-avatar', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || '이미지 업로드 실패');
            }

            const data = await res.json();
            return data.url;
        } catch (err: any) {
            console.error('Image upload error:', err);
            return null;
        }
    };

    const handleSubmit = async () => {
        if (parsedStudents.length === 0 || !selectedClassroom) return;
        setSubmitting(true);
        setUploadingImages(true);

        try {
            // 먼저 학생 계정을 생성하고, 생성된 사용자 ID를 받아옴
            // 이미지가 있는 학생들의 경우 이미지를 먼저 업로드해야 하지만,
            // 사용자 ID가 필요하므로 두 단계로 나눠야 함
            
            // 1단계: 학생 계정 생성 (이미지 없이)
            const studentsWithoutImages = parsedStudents.map(s => ({
                ...s,
                photoUrl: s.photoUrl, // URL은 그대로 전달
                photoFile: undefined, // File은 제외
            }));

            const res = await fetch("/api/teacher/bulk-register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    students: studentsWithoutImages,
                    classroomId: selectedClassroom,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "등록 실패", {
                    description: data.details || "관리자에게 문의하거나 .env 설정을 확인하세요."
                });
                setSubmitting(false);
                setUploadingImages(false);
                return;
            }

            // 2단계: 성공한 학생들의 이미지 업로드 및 프로필 업데이트
            const resultsWithImages: ImportResult[] = [];
            const imageUploadPromises: Promise<void>[] = [];

            for (let i = 0; i < data.results.length; i++) {
                const result = data.results[i];
                const student = parsedStudents[i];

                if (result.success && student.photoFile && result.userId) {
                    // 이미지 업로드
                    const uploadPromise = uploadImage(student.photoFile, result.userId)
                        .then(async (imageUrl) => {
                            if (imageUrl && result.userId) {
                                // 프로필 업데이트 (이미지 URL 설정)
                                const { error: updateError } = await supabase
                                    .from("profiles")
                                    .update({ profile_image_url: imageUrl })
                                    .eq("id", result.userId);

                                if (updateError) {
                                    console.error(`프로필 업데이트 실패 (${result.name}):`, updateError);
                                }
                            }
                        });
                    imageUploadPromises.push(uploadPromise);
                }

                resultsWithImages.push(result);
            }

            // 이미지 업로드 완료 대기
            if (imageUploadPromises.length > 0) {
                await Promise.all(imageUploadPromises);
                toast.success("이미지 업로드 완료");
            }

            setResults(resultsWithImages);
            setStep("done");
            toast.success(`${data.successCount}명 등록 완료!`);
        } catch (err: any) {
            toast.error("네트워크 오류 발생: " + err.message);
        } finally {
            setSubmitting(false);
            setUploadingImages(false);
        }
    };

    const handleDownloadTemplate = () => {
        const blob = new Blob(["\uFEFF" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "학생_일괄등록_양식.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadResults = () => {
        if (!results) return;
        const header = "이름,학번,이메일,임시비밀번호,등록결과\n";
        const rows = results.map((r) =>
            `${r.name},${r.studentNumber},${r.email},${r.success ? r.password : "-"},${r.success ? "성공" : `실패: ${r.error}`}`
        );
        const blob = new Blob(["\uFEFF" + header + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "일괄등록_결과.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const successCount = results?.filter((r) => r.success).length ?? 0;
    const failCount = results?.filter((r) => !r.success).length ?? 0;

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">학생 일괄 등록</h1>
                    <p className="text-slate-500 text-sm mt-0.5">CSV 파일로 여러 학생을 한 번에 등록합니다.</p>
                </div>
            </div>

            {/* Step 1: Input */}
            {step === "input" && (
                <div className="space-y-6">
                    {/* 안내 */}
                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardContent className="pt-5">
                            <div className="flex gap-3">
                                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800 space-y-1">
                                    <p className="font-semibold">등록 방법</p>
                                    <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                                        <li><strong>방법 1:</strong> ZIP 파일 업로드 (CSV + 이미지 파일 포함) - 권장</li>
                                        <li><strong>방법 2:</strong> CSV 파일을 업로드하거나 아래 텍스트 영역에 직접 붙여넣기</li>
                                        <li>ZIP 파일 구조: <code className="bg-blue-100 px-1 rounded text-xs">students.csv</code> + <code className="bg-blue-100 px-1 rounded text-xs">photos/</code> 폴더</li>
                                        <li>CSV 형식: <code className="bg-blue-100 px-1 rounded text-xs">이름,학번,학과,반,성별,동아리,사진파일명</code></li>
                                        <li>초기 비밀번호: <code className="bg-blue-100 px-1 rounded text-xs">student + 학번</code> (예: student20240001)</li>
                                        <li>이메일 미입력 시: <code className="bg-blue-100 px-1 rounded text-xs">학번@jobnavigator.com</code> 으로 자동 생성</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 학급 선택 */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Users className="h-4 w-4 text-purple-600" /> 학급 선택
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {classrooms.length === 0 ? (
                                <p className="text-sm text-slate-500">활성 학급이 없습니다. 먼저 학급을 생성하세요.</p>
                            ) : (
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={selectedClassroom}
                                    onChange={(e) => setSelectedClassroom(e.target.value)}
                                >
                                    {classrooms.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            )}
                        </CardContent>
                    </Card>

                    {/* CSV 입력 */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-purple-600" /> 학생 데이터 입력
                                </CardTitle>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-1.5">
                                        <Download className="h-3.5 w-3.5" /> 양식 다운로드
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => zipInputRef.current?.click()}
                                        className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
                                    >
                                        <ImageIcon className="h-3.5 w-3.5" /> ZIP 업로드
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="gap-1.5"
                                    >
                                        <Upload className="h-3.5 w-3.5" /> CSV 업로드
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.txt"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                    <input
                                        ref={zipInputRef}
                                        type="file"
                                        accept=".zip"
                                        className="hidden"
                                        onChange={handleZipUpload}
                                    />
                                </div>
                            </div>
                            <CardDescription>
                                CSV 형식: 이름,학번,이메일(선택),학과,반,성별,동아리,사진파일명 또는 사진URL
                                {imageFiles.size > 0 && (
                                    <span className="ml-2 text-purple-600 font-semibold">
                                        ({imageFiles.size}개의 이미지 파일 로드됨)
                                    </span>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <textarea
                                className="w-full h-48 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                placeholder={`이름,학번,이메일(선택)\n김철수,20240001,\n이영희,20240002,\n박민준,20240003,student003@school.kr`}
                                value={csvText}
                                onChange={(e) => setCsvText(e.target.value)}
                            />
                            {parseError && (
                                <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>{parseError}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button
                            className="bg-purple-600 hover:bg-purple-700 gap-2"
                            onClick={handlePreview}
                            disabled={!csvText.trim() || classrooms.length === 0}
                        >
                            미리보기 →
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 2: Preview */}
            {step === "preview" && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">등록 미리보기</CardTitle>
                                    <CardDescription>
                                        총 <strong>{parsedStudents.length}명</strong>의 학생이 파싱되었습니다.
                                        학급: <strong>{classrooms.find(c => c.id === selectedClassroom)?.name}</strong>
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setStep("input")}>
                                    수정
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {parseError && (
                                <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>일부 행에 오류가 있습니다: {parseError}</span>
                                </div>
                            )}
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left font-medium text-slate-600 w-12">번호</th>
                                            <th className="px-4 py-2.5 text-left font-medium text-slate-600">이름</th>
                                            <th className="px-4 py-2.5 text-left font-medium text-slate-600">학번</th>
                                            <th className="px-4 py-2.5 text-left font-medium text-slate-600">로그인 이메일</th>
                                            <th className="px-4 py-2.5 text-left font-medium text-slate-600">임시 비밀번호</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {parsedStudents.map((s, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="px-4 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                                                <td className="px-4 py-2.5 font-medium">{s.name}</td>
                                                <td className="px-4 py-2.5 text-slate-600">{s.studentNumber}</td>
                                                <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">
                                                    {s.email || `${s.studentNumber}@jobnavigator.com`}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">
                                                    student{s.studentNumber}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setStep("input")}>이전</Button>
                        <Button
                            className="bg-purple-600 hover:bg-purple-700 gap-2"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {uploadingImages ? "이미지 업로드 중..." : "등록 중..."}
                                </>
                            ) : (
                                <><Users className="h-4 w-4" /> {parsedStudents.length}명 일괄 등록</>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Done */}
            {step === "done" && results && (
                <div className="space-y-6">
                    {/* 결과 요약 */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="border-slate-200">
                            <CardContent className="pt-6 text-center">
                                <p className="text-3xl font-bold text-slate-800">{results.length}</p>
                                <p className="text-sm text-slate-500 mt-1">전체</p>
                            </CardContent>
                        </Card>
                        <Card className="border-green-200 bg-green-50/50">
                            <CardContent className="pt-6 text-center">
                                <p className="text-3xl font-bold text-green-700">{successCount}</p>
                                <p className="text-sm text-green-600 mt-1">등록 성공</p>
                            </CardContent>
                        </Card>
                        <Card className="border-red-200 bg-red-50/50">
                            <CardContent className="pt-6 text-center">
                                <p className="text-3xl font-bold text-red-700">{failCount}</p>
                                <p className="text-sm text-red-600 mt-1">등록 실패</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 상세 결과 */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">등록 결과 상세</CardTitle>
                                <Button variant="outline" size="sm" onClick={handleDownloadResults} className="gap-1.5">
                                    <Download className="h-3.5 w-3.5" /> 결과 다운로드
                                </Button>
                            </div>
                            <CardDescription>
                                학생에게 이메일과 임시 비밀번호를 안내해주세요. 첫 로그인 후 비밀번호를 변경하도록 권장하세요.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left font-medium text-slate-600 w-8">번호</th>
                                            <th className="px-4 py-2.5 text-left font-medium text-slate-600 w-8">상태</th>
                                            <th className="px-4 py-2.5 text-left font-medium text-slate-600">이름</th>
                                            <th className="px-4 py-2.5 text-left font-medium text-slate-600">이메일</th>
                                            <th className="px-4 py-2.5 text-left font-medium text-slate-600">임시 비밀번호</th>
                                            <th className="px-4 py-2.5 text-left font-medium text-slate-600">결과</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {results.map((r, i) => (
                                            <tr key={i} className={r.success ? "hover:bg-slate-50" : "bg-red-50/50"}>
                                                <td className="px-4 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                                                <td className="px-4 py-2.5">
                                                    {r.success
                                                        ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        : <XCircle className="h-4 w-4 text-red-500" />
                                                    }
                                                </td>
                                                <td className="px-4 py-2.5 font-medium">{r.name}</td>
                                                <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">{r.email}</td>
                                                <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">
                                                    {r.success ? r.password : "-"}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {r.success ? (
                                                        <Badge className="bg-green-100 text-green-700 text-xs">성공</Badge>
                                                    ) : (
                                                        <span className="text-xs text-red-600">{r.error}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => { setStep("input"); setResults(null); setCsvText(""); }}>
                            새로 등록
                        </Button>
                        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => router.push("/teacher/students")}>
                            학생 관리로 이동
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
