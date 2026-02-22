"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Upload, FileText, CheckCircle2, XCircle, Loader2,
    AlertTriangle, BookOpen, ArrowLeft, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface ParsedGuide {
    studentNumber: string;
    guideContent: string;
    recommendedActivities: string;
    checklist: string;
}

interface ImportResult {
    studentNumber: string;
    studentName: string;
    success: boolean;
    error?: string;
}

// career_guides.csv 파싱
// 헤더: student_number,guide_content,recommended_activities,checklist
function parseCareerGuideCSV(text: string): { guides: ParsedGuide[]; error: string | null } {
    const lines = text.trim().split("\n").filter((l) => l.trim());
    if (lines.length === 0) return { guides: [], error: "내용이 비어 있습니다." };

    const guides: ParsedGuide[] = [];
    const errors: string[] = [];

    // 헤더 감지
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader =
        firstLineLower.includes("student_number") ||
        firstLineLower.includes("guide_content") ||
        firstLineLower.includes("학번");

    const startIdx = hasHeader ? 1 : 0;

    // 헤더 컬럼 인덱스 결정
    let snIdx = 0, gcIdx = 1, raIdx = 2, clIdx = 3;
    if (hasHeader) {
        const headerCols = lines[0].split(",").map((c) => c.trim().toLowerCase());
        const findIdx = (keys: string[]) =>
            headerCols.findIndex((c) => keys.some((k) => c.includes(k)));
        const s = findIdx(["student_number", "학번"]);
        const g = findIdx(["guide_content", "가이드"]);
        const r = findIdx(["recommended", "권장"]);
        const cl = findIdx(["checklist", "체크"]);
        if (s >= 0) snIdx = s;
        if (g >= 0) gcIdx = g;
        if (r >= 0) raIdx = r;
        if (cl >= 0) clIdx = cl;
    }

    for (let i = startIdx; i < lines.length; i++) {
        // CSV에서 쉼표로 분리 (따옴표 안의 쉼표 처리)
        const cols = splitCSVLine(lines[i]);

        const studentNumber = (cols[snIdx] || "").trim();
        const guideContent = (cols[gcIdx] || "").trim();
        const recommendedActivities = (cols[raIdx] || "").trim();
        const checklist = (cols[clIdx] || "").trim();

        if (!studentNumber) {
            errors.push(`${i + 1}행: 학번이 없습니다.`);
            continue;
        }
        if (!guideContent) {
            errors.push(`${i + 1}행: 진로 가이드 내용이 없습니다.`);
            continue;
        }

        guides.push({ studentNumber, guideContent, recommendedActivities, checklist });
    }

    if (errors.length > 0) return { guides, error: errors.join(" | ") };
    return { guides, error: null };
}

// 쉼표로 분리 (따옴표 내부의 쉼표는 무시)
function splitCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
            result.push(current.replace(/^"|"$/g, "").trim());
            current = "";
        } else {
            current += ch;
        }
    }
    result.push(current.replace(/^"|"$/g, "").trim());
    return result;
}

export default function CareerGuidesImportPage() {
    const [guides, setGuides] = useState<ParsedGuide[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>("");
    const [importing, setImporting] = useState(false);
    const [results, setResults] = useState<ImportResult[] | null>(null);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setResults(null);
        setGuides([]);
        setParseError(null);

        // EUC-KR 우선 시도, 실패 시 UTF-8
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            processText(text);
        };
        reader.onerror = () => {
            // EUC-KR 재시도
            const r2 = new FileReader();
            r2.onload = (ev2) => processText(ev2.target?.result as string);
            r2.readAsText(file, "EUC-KR");
        };
        reader.readAsText(file, "UTF-8");
    };

    const processText = (text: string) => {
        // 깨진 텍스트(EUC-KR)면 재시도
        if (text.includes("???") || /[\uFFFD]/.test(text)) {
            const bytes = new Uint8Array([...text].map((c) => c.charCodeAt(0)));
            try {
                const decoded = new TextDecoder("euc-kr").decode(bytes);
                const { guides: parsed, error } = parseCareerGuideCSV(decoded);
                setGuides(parsed);
                setParseError(error);
                return;
            } catch { /* 무시 */ }
        }
        const { guides: parsed, error } = parseCareerGuideCSV(text);
        setGuides(parsed);
        setParseError(error);
    };

    const handleImport = async () => {
        if (guides.length === 0) return;
        setImporting(true);
        setResults(null);

        try {
            const res = await fetch("/api/teacher/import-career-guides", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guides }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error("오류: " + (data.error || "알 수 없는 오류"));
                return;
            }

            setResults(data.results || []);
            if (data.failCount === 0) {
                toast.success(`✅ ${data.successCount}명 진로 가이드 등록 완료!`);
            } else {
                toast.warning(
                    `${data.successCount}명 성공, ${data.failCount}명 실패`,
                    { description: "실패 목록을 확인해주세요." }
                );
            }
        } catch {
            toast.error("네트워크 오류가 발생했습니다.");
        } finally {
            setImporting(false);
        }
    };

    const successCount = results?.filter((r) => r.success).length ?? 0;
    const failCount = results?.filter((r) => !r.success).length ?? 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6">
            {/* 헤더 */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/teacher/feedback">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-purple-600" />
                        진로 가이드 일괄 등록
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        career_guides.csv 파일을 업로드하면 학생 피드백에 자동으로 등록됩니다.
                    </p>
                </div>
            </div>

            {/* 파일 업로드 영역 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">① CSV 파일 선택</CardTitle>
                    <CardDescription>
                        <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                            student_number, guide_content, recommended_activities, checklist
                        </span>{" "}
                        컬럼이 있는 CSV 파일을 업로드하세요. (EUC-KR / UTF-8 모두 지원)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div
                        className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-purple-300 hover:bg-purple-50/30 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                        {fileName ? (
                            <div className="space-y-1">
                                <p className="font-medium text-slate-700 flex items-center justify-center gap-2">
                                    <FileText className="h-4 w-4 text-purple-500" />
                                    {fileName}
                                </p>
                                <p className="text-sm text-slate-400">다른 파일을 선택하려면 클릭하세요</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <p className="font-medium text-slate-600">클릭하여 CSV 파일 선택</p>
                                <p className="text-sm text-slate-400">career_guides.csv</p>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>

                    {parseError && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{parseError}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 미리보기 */}
            {guides.length > 0 && !results && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                            <span>② 미리보기</span>
                            <Badge variant="secondary">{guides.length}명</Badge>
                        </CardTitle>
                        <CardDescription>
                            아래 내용이 각 학생의 피드백(💡 조언)으로 등록됩니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[420px] overflow-y-auto">
                        {guides.map((g, idx) => (
                            <div
                                key={idx}
                                className="rounded-lg border border-slate-200 overflow-hidden"
                            >
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                                >
                                    <span className="font-medium text-slate-800">
                                        학번 {g.studentNumber}
                                    </span>
                                    <span className="flex items-center gap-2 text-sm text-slate-500">
                                        <span className="hidden sm:block truncate max-w-[200px]">{g.guideContent}</span>
                                        {expandedIdx === idx
                                            ? <ChevronUp className="h-4 w-4 shrink-0" />
                                            : <ChevronDown className="h-4 w-4 shrink-0" />}
                                    </span>
                                </button>
                                {expandedIdx === idx && (
                                    <div className="px-4 pb-4 space-y-3 text-sm bg-slate-50 border-t">
                                        <div className="pt-3">
                                            <p className="font-semibold text-slate-600 mb-1">📋 진로 가이드</p>
                                            <p className="text-slate-700 whitespace-pre-wrap">{g.guideContent}</p>
                                        </div>
                                        {g.recommendedActivities && (
                                            <div>
                                                <p className="font-semibold text-slate-600 mb-1">✅ 권장 활동</p>
                                                <p className="text-slate-700 whitespace-pre-wrap">{g.recommendedActivities}</p>
                                            </div>
                                        )}
                                        {g.checklist && (
                                            <div>
                                                <p className="font-semibold text-slate-600 mb-1">📌 체크리스트</p>
                                                <p className="text-slate-700 whitespace-pre-wrap">{g.checklist}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* 등록 버튼 */}
            {guides.length > 0 && !results && (
                <div className="flex justify-end">
                    <Button
                        size="lg"
                        className="bg-purple-600 hover:bg-purple-700 gap-2"
                        onClick={handleImport}
                        disabled={importing}
                    >
                        {importing
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> 등록 중...</>
                            : <><BookOpen className="h-4 w-4" /> {guides.length}명 진로 가이드 등록</>}
                    </Button>
                </div>
            )}

            {/* 결과 */}
            {results && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">등록 결과</CardTitle>
                        <div className="flex gap-3 mt-1">
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                성공 {successCount}명
                            </Badge>
                            {failCount > 0 && (
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                    실패 {failCount}명
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[380px] overflow-y-auto">
                        {results.map((r, idx) => (
                            <div
                                key={idx}
                                className={`flex items-start gap-3 rounded-lg p-3 border text-sm ${
                                    r.success
                                        ? "bg-green-50 border-green-100"
                                        : "bg-red-50 border-red-100"
                                }`}
                            >
                                {r.success
                                    ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                                    : <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                                <div className="flex-1 min-w-0">
                                    <span className="font-medium text-slate-800">
                                        학번 {r.studentNumber}
                                        {r.studentName && r.studentName !== "알 수 없음"
                                            ? ` (${r.studentName})`
                                            : ""}
                                    </span>
                                    {!r.success && r.error && (
                                        <p className="text-red-600 mt-0.5">{r.error}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                    {failCount > 0 && (
                        <div className="px-6 pb-4">
                            <p className="text-xs text-slate-500">
                                💡 실패한 학번은 먼저{" "}
                                <Link href="/teacher/students/bulk-import" className="text-purple-600 underline">
                                    학생 일괄 등록
                                </Link>
                                을 완료한 후 다시 시도해주세요.
                            </p>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
