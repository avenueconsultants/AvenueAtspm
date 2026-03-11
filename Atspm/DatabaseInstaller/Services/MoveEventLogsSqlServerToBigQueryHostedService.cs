#region license
// Copyright 2026 Utah Departement of Transportation
// for DatabaseInstaller - DatabaseInstaller.Services/MoveEventLogsSqlServerToBigQueryHostedService.cs
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
using Google.Apis.Bigquery.v2.Data;
using Google.Cloud.BigQuery.V2;
using Google.Cloud.Storage.V1;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Utah.Udot.Atspm.Data;
using Utah.Udot.Atspm.Data.Enums;
using Utah.Udot.Atspm.Data.Models;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.Infrastructure.Repositories.EventLogRepositories;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;
using Utah.Udot.Atspm.Specifications;
using Utah.Udot.NetStandardToolkit.Extensions;

namespace DatabaseInstaller.Services
{
    public class MoveEventLogsSqlServerToBigQueryHostedService : TransferEventLogsToBigQueryBase<IndianaEventDto>
    {
        public MoveEventLogsSqlServerToBigQueryHostedService(
            BigQueryClient client,
            StorageClient storageClient,
            IOptions<TransferCommandConfiguration> config,
            ILogger<MoveEventLogsSqlServerToBigQueryHostedService> logger,
            ILocationRepository locationRepository)
            : base(client, storageClient, logger, locationRepository, config)
        {
        }

        protected override string TableName => "IndianaEventLogs";

        protected override TableSchema GetSchema() => new TableSchemaBuilder
        {
            { "LocationIdentifier", BigQueryDbType.String, BigQueryFieldMode.Required },
            { "Timestamp", BigQueryDbType.DateTime, BigQueryFieldMode.Required },
            { "EventCode", BigQueryDbType.Int64, BigQueryFieldMode.Required },
            { "EventParam", BigQueryDbType.Int64, BigQueryFieldMode.Required }
        }.Build();

        protected override List<string> ResolveLocationIds()
        {
            var query = _locationRepository
                .GetList()
                .Include(l => l.Devices)
                .AsQueryable();

            if (_config.Device.HasValue)
            {
                query = query.Where(l => l.Devices.Any(d => d.DeviceType == (DeviceTypes)_config.Device));
            }

            if (!string.IsNullOrEmpty(_config.Locations))
            {
                var locationIdentifiers = _config.Locations.Split(',', StringSplitOptions.RemoveEmptyEntries);
                query = query.Where(l => locationIdentifiers.Contains(l.LocationIdentifier));
            }

            return query
                .FromSpecification(new ActiveLocationSpecification())
                .GroupBy(l => l.LocationIdentifier)
                .Select(g => g.OrderByDescending(l => l.Start).First().LocationIdentifier)
                .ToList();
        }

        protected override async Task<List<IndianaEventDto>> GetEventsAsync(string locationId, DateTime day)
        {
            using var sqlContext = CreateSqlContext();
            var sqlRepo = new IndianaEventLogEFRepository(sqlContext, NullLogger<IndianaEventLogEFRepository>.Instance);

            var allLogs = sqlRepo.GetList()
                .Where(l => l.LocationIdentifier == locationId && l.ArchiveDate == DateOnly.FromDateTime(day))
                .AsNoTracking()
                .AsEnumerable()
                .SelectMany(m => m.Data)
                .FromSpecification(new EventLogSpecification(locationId, day, day.AddDays(1).AddMilliseconds(-1)))
                .Cast<IndianaEvent>()
                .ToList();

            return allLogs.Select(log => new IndianaEventDto
            {
                LocationIdentifier = log.LocationIdentifier,
                Timestamp = log.Timestamp,
                EventCode = log.EventCode,
                EventParam = log.EventParam
            }).ToList();
        }

        private EventLogContext CreateSqlContext()
        {
            var options = new DbContextOptionsBuilder<EventLogContext>()
                .UseSqlServer(_config.Source)
                .Options;

            return new EventLogContext(options);
        }
    }
}
