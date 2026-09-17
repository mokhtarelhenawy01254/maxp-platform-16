using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

class Program
{
    [DllImport("user32.dll")]
    static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true)]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    static extern bool QueryFullProcessImageName(IntPtr hProcess, int dwFlags, StringBuilder lpExeName, ref int lpdwSize);

    [DllImport("kernel32.dll")]
    static extern IntPtr OpenProcess(int dwDesiredAccess, bool bInheritHandle, int dwProcessId);

    [DllImport("kernel32.dll")]
    static extern bool CloseHandle(IntPtr hObject);

    const int PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

    static void Main()
    {
        try
        {
            // Emit UTF-8 so redirected output (Node execFileSync) decodes
            // Arabic/Unicode window titles correctly.
            try { Console.OutputEncoding = System.Text.Encoding.UTF8; } catch {}

            IntPtr hwnd = GetForegroundWindow();
            if (hwnd == IntPtr.Zero)
            {
                Console.WriteLine("Desktop|||Windows Desktop|||");
                return;
            }

            uint pid = 0;
            GetWindowThreadProcessId(hwnd, out pid);

            string processName = "Unknown";
            string exePath = "";
            try
            {
                if (pid > 0)
                {
                    Process p = Process.GetProcessById((int)pid);
                    processName = p.ProcessName;
                }
            }
            catch {}

            // Full executable path — lets the tracker resolve the real app behind
            // ApplicationFrameHost (UWP/store apps) instead of the generic host name.
            try
            {
                IntPtr hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, (int)pid);
                if (hProcess != IntPtr.Zero)
                {
                    StringBuilder exeSb = new StringBuilder(1024);
                    int size = exeSb.Capacity;
                    if (QueryFullProcessImageName(hProcess, 0, exeSb, ref size))
                    {
                        exePath = exeSb.ToString();
                    }
                    CloseHandle(hProcess);
                }
            }
            catch {}

            StringBuilder sb = new StringBuilder(512);
            GetWindowText(hwnd, sb, 512);
            string title = sb.ToString().Trim();

            Console.WriteLine(processName + "|||" + title + "|||" + exePath);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error|||" + ex.Message + "|||");
        }
    }
}
