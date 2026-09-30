using System;
using System.IO;
using System.Reflection;
using System.Text.Json;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace AeroMark
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            ApplicationConfiguration.Initialize();
            Application.Run(new FormMain(args));
        }
    }

    public class FormMain : Form
    {
        private WebView2 webView;
        private string? initialFilePath = null;

        public FormMain(string[] args)
        {
            if (args.Length > 0) initialFilePath = args[0];
            
            this.Text = "AeroMark";
            this.Width = 1200;
            this.Height = 800;
            this.StartPosition = FormStartPosition.CenterScreen;
            
            webView = new WebView2 { Dock = DockStyle.Fill };
            this.Controls.Add(webView);
            
            InitializeAsync();
        }

        private async void InitializeAsync()
        {
            string tempFolder = Path.Combine(Path.GetTempPath(), "AeroMarkAssets");
            ExtractEmbeddedAssets(tempFolder);

            await webView.EnsureCoreWebView2Async(null);

            webView.CoreWebView2.SetVirtualHostNameToFolderMapping("app.aeromark.local", tempFolder, CoreWebView2HostResourceAccessKind.Allow);
            
            webView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
            
            webView.CoreWebView2.Navigate("https://app.aeromark.local/index.html");
            
            webView.NavigationCompleted += (s, e) => {
                if (!string.IsNullOrEmpty(initialFilePath) && File.Exists(initialFilePath))
                {
                    LoadFileIntoWebView(initialFilePath);
                }
            };
        }

        private void LoadFilesIntoWebView(string[] paths)
        {
            try
            {
                var filesList = new System.Collections.Generic.List<object>();
                foreach (string path in paths)
                {
                    string content = File.ReadAllText(path);
                    filesList.Add(new { path = path, content = content });
                }
                var data = new { type = "open_files", files = filesList };
                webView.CoreWebView2.PostWebMessageAsString(JsonSerializer.Serialize(data));
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error reading files: " + ex.Message);
            }
        }

        private void LoadFileIntoWebView(string path)
        {
            LoadFilesIntoWebView(new[] { path });
        }

        private void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                var msg = e.TryGetWebMessageAsString();
                using var doc = JsonDocument.Parse(msg);
                var root = doc.RootElement;
                string? type = root.TryGetProperty("type", out var typeElement) ? typeElement.GetString() : null;

                if (type == "open_file_dialog")
                {
                    using OpenFileDialog ofd = new OpenFileDialog();
                    ofd.Multiselect = true;
                    ofd.Filter = "Markdown Files (*.md)|*.md|Text Files (*.txt)|*.txt|All Files (*.*)|*.*";
                    if (ofd.ShowDialog() == DialogResult.OK)
                    {
                        LoadFilesIntoWebView(ofd.FileNames);
                    }
                }
                else if (type == "save_file")
                {
                    string? path = root.TryGetProperty("path", out var pathElement) && pathElement.ValueKind != JsonValueKind.Null ? pathElement.GetString() : null;
                    string? content = root.TryGetProperty("content", out var contentElement) ? contentElement.GetString() : "";

                    if (string.IsNullOrEmpty(path))
                    {
                        using SaveFileDialog sfd = new SaveFileDialog();
                        sfd.Filter = "Markdown Files (*.md)|*.md";
                        if (sfd.ShowDialog() == DialogResult.OK)
                        {
                            File.WriteAllText(sfd.FileName, content ?? "");
                            LoadFileIntoWebView(sfd.FileName); // Refresh path in UI
                        }
                    }
                    else
                    {
                        File.WriteAllText(path, content ?? "");
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("IPC Error: " + ex.Message);
            }
        }

        private void ExtractEmbeddedAssets(string targetPath)
        {
            if (!Directory.Exists(targetPath)) Directory.CreateDirectory(targetPath);
            
            var assembly = Assembly.GetExecutingAssembly();
            string[] resourceNames = assembly.GetManifestResourceNames();
            foreach (var resName in resourceNames)
            {
                if (resName.StartsWith("AeroMark.html."))
                {
                    string fileName = resName.Substring("AeroMark.html.".Length);
                    string outPath = Path.Combine(targetPath, fileName);
                    using Stream? s = assembly.GetManifestResourceStream(resName);
                    if (s != null) {
                        using FileStream fs = new FileStream(outPath, FileMode.Create, FileAccess.Write);
                        s.CopyTo(fs);
                    }
                }
            }
        }
    }
}