﻿#region license
// Copyright 2025 Utah Departement of Transportation
// for Infrastructure - Utah.Udot.Atspm.Infrastructure.Services.DownloaderClients/SSHNetSFTPDownloaderClient.cs
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
#endregion

using Renci.SshNet;
using Renci.SshNet.Common;
using System.Net;
using Utah.Udot.Atspm.Data.Enums;

namespace Utah.Udot.Atspm.Infrastructure.Services.DownloaderClients
{
    /// <summary>
    /// Connect to services and interact with their file directories using <see cref="ISftpClientWrapper"/>
    /// </summary>
    public class SSHNetSFTPDownloaderClient : DownloaderClientBase
    {
        private ISftpClientWrapper _client;

        ///<inheritdoc/>
        public SSHNetSFTPDownloaderClient() { }

        /// <summary>
        /// <inheritdoc/>
        /// </summary>
        /// <param name="client">External client used for special settings and mocking</param>
        public SSHNetSFTPDownloaderClient(ISftpClientWrapper client)
        {
            _client = client;
        }

        #region IDownloaderClient

        ///<inheritdoc/>
        public override TransportProtocols Protocol => TransportProtocols.Sftp;

        ///<inheritdoc/>
        public override bool IsConnected => _client != null && _client.IsConnected;

        ///<inheritdoc/>
        protected override Task Connect(IPEndPoint connection, NetworkCredential credentials, int connectionTimeout = 2000, int operationTimeout = 2000, Dictionary<string, string> connectionProperties = null, CancellationToken token = default)
        {
            var connectionInfo = new ConnectionInfo
                (connection.Address.ToString(),
                connection.Port,
                credentials.UserName,
                new PasswordAuthenticationMethod(credentials.UserName, credentials.Password))
            {
                Timeout = TimeSpan.FromMilliseconds(connectionTimeout)
            };

            _client ??= new SftpClientWrapper(connectionInfo);

            _client.OperationTimeout = TimeSpan.FromMilliseconds(operationTimeout);

            _client.Connect();

            return Task.CompletedTask;
        }

        ///<inheritdoc/>
        protected override Task DeleteResource(Uri resource, CancellationToken token = default)
        {
            _client.DeleteFile(resource.LocalPath);

            return Task.CompletedTask;
        }

        ///<inheritdoc/>
        protected override Task Disconnect(CancellationToken token = default)
        {
            _client.Disconnect();

            return Task.CompletedTask;
        }

        ///<inheritdoc/>
        protected override async Task<FileInfo> DownloadResource(FileInfo file, Uri remote, CancellationToken token = default)
        {
            return await _client.DownloadFileAsync(file.FullName, remote.LocalPath);
        }

        ///<inheritdoc/>
        protected override async Task<IEnumerable<Uri>> ListResources(string path, CancellationToken token = default, params string[] query)
        {
            var result = await _client.ListDirectoryAsync(path, query);

            return result.Select(s => new UriBuilder(Uri.UriSchemeSftp, _client.ConnectionInfo.Host, _client.ConnectionInfo.Port, s).Uri).ToList();
        }

        #endregion

        ///<inheritdoc/>
        protected override void DisposeManagedCode()
        {
            if (_client != null)
            {
                if (_client.IsConnected)
                {
                    _client.Disconnect();
                }
                _client.Dispose();
                _client = null;
            }
        }
    }

    /// <summary>
    /// Interface wrapper for Renci.SshNet so it can be mocked, tested and injected
    /// </summary>
    public interface ISftpClientWrapper : ISftpClient
    {
        ConnectionInfo ConnectionInfo { get; }
        bool IsConnected { get; }
        TimeSpan KeepAliveInterval { get; set; }

        event EventHandler<ExceptionEventArgs> ErrorOccurred;
        event EventHandler<HostKeyEventArgs> HostKeyReceived;

        void Connect();
        void Disconnect();
        void Dispose();
        void SendKeepAlive();

        Task<FileInfo> DownloadFileAsync(string localPath, string remotePath);

        Task<IEnumerable<string>> ListDirectoryAsync(string directory, params string[] filters);
    }

    /// <summary>
    /// Implementation wrapper for Renci.SshNet so it can be mocked, tested and injected
    /// </summary>
    public class SftpClientWrapper : SftpClient, ISftpClientWrapper
    {
        public SftpClientWrapper(ConnectionInfo connectionInfo) : base(connectionInfo) { }

        public SftpClientWrapper(string host, string username, string password) : base(host, username, password) { }

        public SftpClientWrapper(string host, string username, params PrivateKeyFile[] keyFiles) : base(host, username, keyFiles) { }

        public SftpClientWrapper(string host, int port, string username, string password) : base(host, port, username, password) { }

        public SftpClientWrapper(string host, int port, string username, params PrivateKeyFile[] keyFiles) : base(host, port, username, keyFiles) { }

        public async Task<FileInfo> DownloadFileAsync(string localPath, string remotePath)
        {
            var fileInfo = new FileInfo(localPath);
            fileInfo.Directory.Create();

            using (FileStream fileStream = fileInfo.Create())
            {
                await Task.Factory.FromAsync(BeginDownloadFile(remotePath, fileStream), EndDownloadFile);
            }

            return fileInfo;
        }

        public async Task<IEnumerable<string>> ListDirectoryAsync(string directory, params string[] filters)
        {
            var files = await Task.Factory.FromAsync(BeginListDirectory(directory, null, null), EndListDirectory);

            return files.Select(s => s.FullName).Where(f => filters.Any(a => f.Contains(a))).ToList();
        }
    }
}
