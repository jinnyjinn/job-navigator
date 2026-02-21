@echo off
echo Installing missing Radix UI dependencies...
call npm install @radix-ui/react-icons @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-select @radix-ui/react-dialog @radix-ui/react-avatar @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-toast

echo Done! Run 'npm run dev' again.
pause
