﻿#region license
// Copyright 2025 Utah Departement of Transportation
// for DatabaseInstaller - DatabaseInstaller.Services/TranslateEventLogsService.cs
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

using DatabaseInstaller.Commands;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System.Data;
using System.IO.Compression;
using Utah.Udot.Atspm.Data;
using Utah.Udot.Atspm.Data.Enums;
using Utah.Udot.Atspm.Data.Models;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;
using Utah.Udot.Atspm.Repositories.EventLogRepositories;

namespace DatabaseInstaller.Services
{
    public class TranslateEventLogsService : IHostedService
    {
        private readonly ILogger<TranslateEventLogsService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly ILocationRepository _locationRepository;
        private readonly IIndianaEventLogRepository _indianaEventLogEFRepository;
        private readonly TransferCommandConfiguration _config;

        public TranslateEventLogsService(
            ILogger<TranslateEventLogsService> logger,
            IServiceProvider serviceProvider,
            ILocationRepository locationRepository,
            IOptions<TransferCommandConfiguration> config,
            IIndianaEventLogRepository indianaEventLogEFRepository
            )
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _locationRepository = locationRepository;
            _indianaEventLogEFRepository = indianaEventLogEFRepository;
            _config = config.Value;
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            for (var date = _config.Start; date <= _config.End; date = date.AddDays(1))
            {
                var locations = _locationRepository.GetLatestVersionOfAllLocations(_config.Start);//.Where(l => l.Devices.Select(d => d.DeviceType).Contains(DeviceTypes.WavetronixSpeed));

                _logger.LogInformation("Processing date: {Date} with {LocationCount} locations.", date, locations.Count());

                foreach (var batch in locations.Batch(50))
                {
                    await ProcessBatchAsync(batch, date, cancellationToken);
                }
            }
        }

        private async Task ProcessBatchAsync(IEnumerable<Location> locations, DateTime date, CancellationToken cancellationToken)
        {
            await Parallel.ForEachAsync(locations, async (location, token) =>
            {
                // Create a new scope for the repository (and its DbContext)
                using (var scope = _serviceProvider.CreateScope())
                {
                    var repository = scope.ServiceProvider.GetRequiredService<IIndianaEventLogRepository>();

                    if (repository.GetList().Any(i =>
                            i.ArchiveDate == DateOnly.FromDateTime(date) &&
                            i.LocationIdentifier == location.LocationIdentifier))
                    {
                        _logger.LogInformation(
                            "Location: {LocationId} for Date: {Date} already processed. Skipping...",
                            location.LocationIdentifier, date);
                        return;
                    }
                }

                // Define the query for reading the compressed data.
                string selectQuery = $"SELECT LogData FROM [dbo].[ControllerLogArchives] " +
                                     $"WHERE SignalId = {location.LocationIdentifier} AND ArchiveDate = '{date}'";

                // Set up retry parameters.
                int maxAttempts = 4;
                bool success = false;

                for (int attempt = 1; attempt <= maxAttempts && !token.IsCancellationRequested; attempt++)
                {
                    try
                    {
                        // Open the SQL connection and execute the query.
                        using (var connection = new SqlConnection(_config.Source))
                        {
                            await connection.OpenAsync(token);
                            using (var command = new SqlCommand(selectQuery, connection))
                            using (var reader = await command.ExecuteReaderAsync(token))
                            {
                                if (await reader.ReadAsync(token))
                                {
                                    // Retrieve and decompress the data.
                                    byte[] compressedData = (byte[])reader["LogData"];
                                    byte[] decompressedData;
                                    using (var memoryStream = new MemoryStream(compressedData))
                                    using (var gzipStream = new GZipStream(memoryStream, CompressionMode.Decompress))
                                    using (var decompressedStream = new MemoryStream())
                                    {
                                        await gzipStream.CopyToAsync(decompressedStream, token);
                                        decompressedData = decompressedStream.ToArray();
                                    }

                                    // Convert decompressed bytes into JSON, then deserialize.
                                    string json = System.Text.Encoding.UTF8.GetString(decompressedData);
                                    var jsonObject = JsonConvert.DeserializeObject<List<ControllerEventLog>>(json);
                                    jsonObject.ForEach(x => x.SignalIdentifier = location.LocationIdentifier);

                                    // Convert to the required event format.
                                    var indianaEvents = ConvertToCompressedEvents(
                                        jsonObject,
                                        location,
                                        DateOnly.FromDateTime(date));

                                    // Insert the events (assumed to have its own retry logic).
                                    await InsertWithRetryAsync(indianaEvents, location.LocationIdentifier, date, token);

                                    _logger.LogInformation(
                                        "Processed Location: {LocationId} for Date: {Date} with {RecordCount} records.",
                                        location.LocationIdentifier, date, jsonObject.Count);
                                }
                            }
                        }

                        // If no exception was thrown, mark as success and exit the retry loop.
                        success = true;
                        break;
                    }
                    catch (Exception ex)
                    {
                        if (attempt == maxAttempts)
                        {
                            _logger.LogError(ex,
                                "Error processing Location: {LocationId} for Date: {Date} after {Attempt} attempts",
                                location.LocationIdentifier, date, attempt);
                            // Optionally rethrow the exception or handle it as needed.
                        }
                        else
                        {
                            _logger.LogWarning(ex,
                                "Attempt {Attempt} failed processing Location: {LocationId} for Date: {Date}. Retrying in 30 seconds...",
                                attempt, location.LocationIdentifier, date);
                            await Task.Delay(TimeSpan.FromSeconds(30), token);
                        }
                    }
                }

                if (!success)
                {
                    // Optionally handle the scenario where all attempts failed.
                    // For example, log a final error or record the failure for further investigation.
                }
            });
        }


        private async Task InsertWithRetryAsync(CompressedEventLogs<IndianaEvent> indianaEvents, string locationId, DateTime date, CancellationToken token)
        {
            int retryCount = 0;
            const int maxRetries = 4;
            const int delaySeconds = 30;

            while (retryCount < maxRetries)
            {
                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetService<EventLogContext>();

                        if (context != null && indianaEvents != null)
                        {
                            context.CompressedEvents.Add(indianaEvents);
                            await context.SaveChangesAsync(token);
                        }
                    }

                    _logger.LogInformation("Successfully inserted data for Location: {LocationId} on Date: {Date} after {Retries} attempt(s).",
                        locationId, date, retryCount + 1);
                    return; // Exit the retry loop on success
                }
                catch (Exception ex)
                {
                    retryCount++;

                    _logger.LogError(ex, "Error inserting data for Location: {LocationId} on Date: {Date}. Attempt {Retry}/{MaxRetries}. Retrying in {DelaySeconds} seconds...",
                        locationId, date, retryCount, maxRetries, delaySeconds);

                    if (retryCount >= maxRetries)
                    {
                        _logger.LogError("Max retries reached. Failing to insert data for Location: {LocationId} on Date: {Date}.", locationId, date);
                        return;
                    }

                    await Task.Delay(TimeSpan.FromSeconds(delaySeconds), token);
                }
            }
        }

        private CompressedEventLogs<IndianaEvent> ConvertToCompressedEvents(List<ControllerEventLog> objectList, Location location, DateOnly archiveDate)
        {
            var indianaEvents = new List<IndianaEvent>();
            foreach (var item in objectList.Distinct())
            {
                try
                {
                    if (item.EventParam < 32000)
                    {
                        indianaEvents.Add(new IndianaEvent
                        {
                            LocationIdentifier = item.SignalIdentifier,
                            Timestamp = item.Timestamp,
                            EventCode = (short)item.EventCode,
                            EventParam = (short)item.EventParam
                        });
                    }
                }
                catch
                {
                    // Ignore errors
                }
            }

            var deviceId = location.Devices.FirstOrDefault(x => x.DeviceType == DeviceTypes.SignalController)?.Id;
            if (deviceId == null) return null;

            return new CompressedEventLogs<IndianaEvent>
            {
                LocationIdentifier = location.LocationIdentifier,
                ArchiveDate = archiveDate,
                Data = indianaEvents,
                DeviceId = deviceId.Value
            };
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }

    public static class BatchExtensions
    {
        public static IEnumerable<IEnumerable<T>> Batch<T>(this IEnumerable<T> source, int batchSize)
        {
            return source
                .Select((item, index) => new { item, index })
                .GroupBy(x => x.index / batchSize)
                .Select(group => group.Select(x => x.item));
        }
    }
}
