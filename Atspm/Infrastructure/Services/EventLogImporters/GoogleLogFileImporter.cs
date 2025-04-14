#region license
// Copyright 2025 Utah Departement of Transportation
// for Infrastructure - Utah.Udot.Atspm.Infrastructure.Services.EventLogImporters/EventLogFileImporter.cs
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

using Google.Apis.Auth.OAuth2;
using Google.Cloud.Storage.V1;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Runtime.CompilerServices;
using System.Threading.Tasks.Dataflow;
using Utah.Udot.Atspm.Common;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.Infrastructure.Services.EventLogDecoders;

namespace Utah.Udot.Atspm.Infrastructure.Services.EventLogImporters
{
    ///<inheritdoc cref="IEventLogImporter"/>
    public class GoogleLogFileImporter : ExecutableServiceWithProgressAsyncBase<Tuple<Device, FileInfo>, Tuple<Device, EventLogModelBase>, ControllerDecodeProgress>, IEventLogImporter
    {
        #region Fields

        private readonly IEnumerable<IEventLogDecoder> _decoders;
        protected readonly ILogger _log;
        protected readonly EventLogImporterConfiguration _options;
        protected readonly IConfiguration _configuration;

        #endregion

        ///<inheritdoc cref="IEventLogImporter"/>
        public GoogleLogFileImporter(IEnumerable<IEventLogDecoder> decoders, ILogger<IEventLogImporter> log, IOptionsSnapshot<EventLogImporterConfiguration> options, IConfiguration configuration) : base(true)
        {
            _decoders = decoders;
            _log = log;
            _options = options?.Get(GetType().Name) ?? options?.Value;
            _configuration = configuration;
        }

        #region Properties

        #endregion

        #region Methods

        private bool IsAcceptableDateRange(EventLogModelBase log)
        {
            return log.Timestamp <= DateTime.Now && log.Timestamp > _options.EarliestAcceptableDate;
        }

        /// <inheritdoc/>
        public override bool CanExecute(Tuple<Device, FileInfo> parameter)
        {
            return parameter != null;
        }

        /// <inheritdoc/>
        /// <exception cref="ArgumentNullException"></exception>
        /// <exception cref="FileNotFoundException"></exception>
        /// <exception cref="ExecuteException"></exception>
        public override async IAsyncEnumerable<Tuple<Device, EventLogModelBase>> Execute(
            Tuple<Device, FileInfo> parameter,
            IProgress<ControllerDecodeProgress> progress = null,
            [EnumeratorCancellation] CancellationToken cancelToken = default)
        {
            if (parameter == null)
                throw new ArgumentNullException(nameof(parameter));

            var device = new Device()
            {
                Id = 0,
                DeviceConfiguration = new DeviceConfiguration()
            };

            var file = parameter.Item2;

            if (!CanExecute(parameter))
                throw new ExecuteException();

            var logMessages = new EventLogDecoderLogMessages(_log, this.GetType().Name, device, file);
            var decoder = _decoders.FirstOrDefault(w => w.GetType().Name == nameof(GoogleLogToIndianaDecoder));
            var google = new GoogleCloudStorageService(_configuration["GoogleBucketPath"]);
            var memoryStream = await google.GetFileStreamAsync(file.Name);

            var decodeBlock = new TransformManyBlock<bool, Tuple<Device, EventLogModelBase>>(async _ =>
            {
                try
                {
                    logMessages.DecodeLogFileMessage(file.FullName);

                    var results = new List<Tuple<Device, EventLogModelBase>>();

                    foreach (var log in decoder.Decode(device, memoryStream, cancelToken))
                    {
                        if (IsAcceptableDateRange(log))
                        {
                            //progress?.Report(new ControllerDecodeProgress(log, ..., ...));
                            results.Add(Tuple.Create(device, log));
                        }
                    }

                    logMessages.DecodedLogsMessage(file.FullName, results.Count);

                    return results;
                }
                catch (EventLogDecoderException e)
                {
                    logMessages.DecodeLogFileException(file.FullName, e);
                }
                catch (OperationCanceledException e)
                {
                    logMessages.OperationCancelledException(file.FullName, e);
                }
                finally
                {
                    memoryStream.Dispose();
                }

                return Enumerable.Empty<Tuple<Device, EventLogModelBase>>();
            }, new ExecutionDataflowBlockOptions { CancellationToken = cancelToken });

            decodeBlock.Post(true);
            decodeBlock.Complete();

            while (await decodeBlock.OutputAvailableAsync(cancelToken))
            {
                while (decodeBlock.TryReceive(out var result))
                {
                    yield return result;
                }
            }

            logMessages.DeletingFileLogsMessage(file.FullName, _options.DeleteSource);
            if (_options.DeleteSource)
                file.Delete();
        }

        #endregion
    }

    public class GoogleCloudStorageService : ICloudStorageService
    {
        private readonly string _bucketName;
        private readonly GoogleCredential _credential;

        public GoogleCloudStorageService(string bucketName)
        {
            _credential = GoogleCredential.FromFile(@"C:\Tools\GCP\atspm-portland\atspm-portland-7d3302f081c1.json");
            _bucketName = bucketName;
        }

        public async Task<Stream> GetFileStreamAsync(string fileName)
        {
            var storageClient = await StorageClient.CreateAsync(_credential);

            //var stream = await storageClient.DownloadObjectAsync(_bucketName, fileName);
            string localFilePath = $@"C:\Users\jbhatia\Desktop\PortlandData 1\PortlandData\test.csv";
            try
            {
                // Download the file directly to the /tmp directory
                var fileStream = File.Create(localFilePath);
                Console.WriteLine("Storing in tmp folder in cloud run");
                await storageClient.DownloadObjectAsync(_bucketName, fileName, fileStream);
                fileStream.Position = 0;
                return fileStream;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error downloading file: {ex.Message}");
                throw;
            }
        }
    }
}
