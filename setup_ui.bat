@echo off
echo Installing dependencies...
call npm install class-variance-authority clsx tailwind-merge lucide-react @radix-ui/react-icons @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-select @radix-ui/react-dialog @radix-ui/react-avatar @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-toast react-hook-form zod @hookform/resolvers

echo Installing Shadcn components...
call npx shadcn@latest add button card input label dialog sheet tabs badge avatar dropdown-menu select form

echo Done! Please check for any errors above.
pause
