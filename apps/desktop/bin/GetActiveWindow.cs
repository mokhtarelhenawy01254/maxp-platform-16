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

    static void Main()
    {
        try
        {
            IntPtr hwnd = GetForegroundWindow();
            if (hwnd == IntPtr.Zero)
            {
                Console.WriteLine("Desktop|||Windows Desktop");
                return;
            }

            uint pid = 0;
            GetWindowThreadProcessId(hwnd, out pid);

            string processName = "Unknown";
            try
            {
                if (pid > 0)
                {
                    Process p = Process.GetProcessById((int)pid);
                    processName = p.ProcessName;
                }
            }
            catch {}

            StringBuilder sb = new StringBuilder(512);
            GetWindowText(hwnd, sb, 512);
            string title = sb.ToString().Trim();

            Console.WriteLine(processName + "|||" + title);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error|||" + ex.Message);
        }
    }
}
