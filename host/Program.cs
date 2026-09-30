using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;

namespace OmniPdfStudio
{
    internal static class AppConstants
    {
        public const string AppName = "OmniPDF Studio";
        public const int WindowWidth = 1280;
        public const int WindowHeight = 850;
        public const int MinWindowWidth = 960;
        public const int MinWindowHeight = 650;

        public const string IconFileName = "icon.ico";
        public const string VirtualHostName = "omnipdf.local";
        public const string IndexFileName = "index.html";
        public const string AppHostUrl = "https://omnipdf.local/index.html";

        public const string LocalDataFolder = "OmniPdfStudio";
        public const string WebDirName = "web";
        public const string UserDataDirName = "webview_profile";
        public const string BundleResourceSuffix = "bundle.zip";

        public const string BrowserArguments = 
            "--js-flags=\"--max-old-space-size=256 --optimize-for-size\" --disable-features=Autofill,Translate,MediaRouter,OptimizationHints --disk-cache-size=16777216 --disable-component-update --disable-sync";
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            ApplicationConfiguration.Initialize();
            
            var form = new Form
            {
                Text = AppConstants.AppName,
                Width = AppConstants.WindowWidth,
                Height = AppConstants.WindowHeight,
                MinimumSize = new System.Drawing.Size(AppConstants.MinWindowWidth, AppConstants.MinWindowHeight),
                StartPosition = FormStartPosition.CenterScreen
            };

            var iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, AppConstants.IconFileName);
            if (File.Exists(iconPath))
            {
                form.Icon = new System.Drawing.Icon(iconPath);
            }
            else
            {
                var parentIcon = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", AppConstants.IconFileName);
                if (File.Exists(parentIcon)) form.Icon = new System.Drawing.Icon(parentIcon);
            }

            // Hardware and memory optimization flags for WebView2 Chromium runtime
            Environment.SetEnvironmentVariable("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", AppConstants.BrowserArguments);

            var webView = new WebView2
            {
                Dock = DockStyle.Fill
            };

            form.Controls.Add(webView);

            // Dynamically manage memory when minimized/restored
            form.Resize += (s, e) =>
            {
                try
                {
                    if (webView?.CoreWebView2 != null)
                    {
                        webView.CoreWebView2.MemoryUsageTargetLevel = form.WindowState == FormWindowState.Minimized
                            ? Microsoft.Web.WebView2.Core.CoreWebView2MemoryUsageTargetLevel.Low
                            : Microsoft.Web.WebView2.Core.CoreWebView2MemoryUsageTargetLevel.Normal;
                    }
                }
                catch { }
            };

            form.Load += async (s, e) =>
            {
                var omniDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), AppConstants.LocalDataFolder);
                var appDataDir = Path.Combine(omniDir, AppConstants.WebDirName);
                var userDataDir = Path.Combine(omniDir, AppConstants.UserDataDirName);

                // 1. Cleanly extract embedded bundle.zip to appDataDir
                try
                {
                    var assembly = Assembly.GetExecutingAssembly();
                    var resName = Array.Find(assembly.GetManifestResourceNames(), r => r.EndsWith(AppConstants.BundleResourceSuffix, StringComparison.OrdinalIgnoreCase));
                    using var resourceStream = !string.IsNullOrEmpty(resName) ? assembly.GetManifestResourceStream(resName) : null;

                    if (resourceStream != null)
                    {
                        Directory.CreateDirectory(appDataDir);
                        using var archive = new ZipArchive(resourceStream);
                        foreach (var entry in archive.Entries)
                        {
                            if (string.IsNullOrEmpty(entry.Name))
                            {
                                Directory.CreateDirectory(Path.Combine(appDataDir, entry.FullName));
                                continue;
                            }
                            var destPath = Path.Combine(appDataDir, entry.FullName);
                            Directory.CreateDirectory(Path.GetDirectoryName(destPath)!);
                            entry.ExtractToFile(destPath, overwrite: true);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Resource extraction note: " + ex.Message);
                }

                // 2. Initialize isolated WebView2 Environment (prevents saving cache/profile next to executable or in Downloads)
                Directory.CreateDirectory(userDataDir);
                var webViewEnv = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(null, userDataDir);
                await webView.EnsureCoreWebView2Async(webViewEnv);
                webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
                webView.CoreWebView2.Settings.IsStatusBarEnabled = false;

                // 3. Bind virtual host mapping directly to appDataDir (guarantees HTTPS origin and prevents cross-file bleed)
                var indexPath = Path.Combine(appDataDir, AppConstants.IndexFileName);
                if (File.Exists(indexPath))
                {
                    webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                        AppConstants.VirtualHostName,
                        appDataDir,
                        Microsoft.Web.WebView2.Core.CoreWebView2HostResourceAccessKind.Allow
                    );
                    webView.Source = new Uri(AppConstants.AppHostUrl);
                }
                else
                {
                    // Fallback for debug/development runs directly in repo folder
                    var devIndex = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", AppConstants.IndexFileName));
                    if (File.Exists(devIndex))
                    {
                        var devDir = Path.GetDirectoryName(devIndex)!;
                        webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                            AppConstants.VirtualHostName,
                            devDir,
                            Microsoft.Web.WebView2.Core.CoreWebView2HostResourceAccessKind.Allow
                        );
                        webView.Source = new Uri(AppConstants.AppHostUrl);
                    }
                    else
                    {
                        MessageBox.Show(
                            $"{AppConstants.AppName} interface bundle could not be found. Please reinstall the application.",
                            $"{AppConstants.AppName} Error",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error
                        );
                    }
                }
            };

            Application.Run(form);
        }
    }
}
