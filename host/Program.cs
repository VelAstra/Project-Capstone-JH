using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;

namespace OmniPdfStudio
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            ApplicationConfiguration.Initialize();
            
            var form = new Form
            {
                Text = "OmniPDF Studio",
                Width = 1280,
                Height = 850,
                MinimumSize = new System.Drawing.Size(960, 650),
                StartPosition = FormStartPosition.CenterScreen
            };

            var iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icon.ico");
            if (File.Exists(iconPath))
            {
                form.Icon = new System.Drawing.Icon(iconPath);
            }
            else
            {
                var parentIcon = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "icon.ico");
                if (File.Exists(parentIcon)) form.Icon = new System.Drawing.Icon(parentIcon);
            }

            var webView = new WebView2
            {
                Dock = DockStyle.Fill
            };

            form.Controls.Add(webView);

            form.Load += async (s, e) =>
            {
                await webView.EnsureCoreWebView2Async();
                webView.CoreWebView2.Settings.AreDevToolsEnabled = true;

                // 1. Check local directory or parent directory
                var indexPath = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "index.html"));
                if (!File.Exists(indexPath))
                {
                    indexPath = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "index.html"));
                }

                // 2. If not found locally, extract embedded bundle to %LOCALAPPDATA%\OmniPdfStudio\web
                if (!File.Exists(indexPath))
                {
                    try
                    {
                        var appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "OmniPdfStudio", "web");
                        var appDataIndex = Path.Combine(appDataDir, "index.html");

                        var assembly = Assembly.GetExecutingAssembly();
                        var resName = Array.Find(assembly.GetManifestResourceNames(), r => r.EndsWith("bundle.zip", StringComparison.OrdinalIgnoreCase));
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

                        if (File.Exists(appDataIndex))
                        {
                            indexPath = appDataIndex;
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine("Resource extraction note: " + ex.Message);
                    }
                }

                if (File.Exists(indexPath))
                {
                    webView.Source = new Uri(indexPath);
                }
                else
                {
                    MessageBox.Show($"OmniPDF Studio interface could not be loaded at {indexPath}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            };

            Application.Run(form);
        }
    }
}
