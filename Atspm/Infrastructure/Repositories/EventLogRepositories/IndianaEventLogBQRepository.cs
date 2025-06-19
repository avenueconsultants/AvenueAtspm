#region license
// Copyright 2025 Utah Department of Transportation
// for Infrastructure - Utah.Udot.Atspm.Infrastructure.Repositories.EventLogRepositories/IndianaEventLogBQRepository.cs
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
#endregion

using Google.Cloud.BigQuery.V2;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.Repositories.EventLogRepositories;
using Utah.Udot.Atspm.ValueObjects;
using Utah.Udot.NetStandardToolkit.Services;

namespace Utah.Udot.Atspm.Infrastructure.Repositories.EventLogRepositories
{
    /// <summary>
    /// BigQuery-based repository for storing uncompressed Indiana events
    /// </summary>
    public class IndianaEventLogBQRepository : IIndianaEventLogBQRepository
    {
        private readonly BigQueryClient _client;
        private readonly string _projectId;
        private readonly string _datasetId;
        private readonly string _tableId = "IndianaEventLogs";
        private readonly ILogger<IndianaEventLogBQRepository> _log;

        public IndianaEventLogBQRepository(BigQueryClient client, IOptions<BigQueryOptions> options, ILogger<IndianaEventLogBQRepository> log)
        {
            _client = client;
            _projectId = options.Value.ProjectId;
            _datasetId = options.Value.DatasetId;
            _log = log;
        }

        public async Task AddAsync(IndianaEvent item)
        {
            var row = MapToRow(item);
            await _client.InsertRowAsync(_datasetId, _tableId, row);
        }

        public async Task AddRangeAsync(IEnumerable<IndianaEvent> items)
        {
            var rows = items.Select(MapToRow);
            await _client.InsertRowsAsync(_datasetId, _tableId, rows);
        }

        public IReadOnlyList<IndianaEvent> GetByLocationAndTimeRange(string locationIdentifier, DateTime start, DateTime end)
        {
            string sql = $@"
                SELECT LocationIdentifier, Timestamp, EventCode, EventParam
                FROM `{_projectId}.{_datasetId}.{_tableId}`
                WHERE LocationIdentifier = @loc
                  AND Timestamp BETWEEN @start AND @end";

            var results = _client.ExecuteQuery(sql, new[]
            {
                new BigQueryParameter("loc", BigQueryDbType.String, locationIdentifier),
                new BigQueryParameter("start", BigQueryDbType.Timestamp, start),
                new BigQueryParameter("end", BigQueryDbType.Timestamp, end)
            });

            return results.Select(r => new IndianaEvent
            {
                LocationIdentifier = (string)r["LocationIdentifier"],
                Timestamp = (DateTime)r["Timestamp"],
                EventCode = Convert.ToInt16(r["EventCode"]),
                EventParam = Convert.ToInt16(r["EventParam"])
            }).ToList();
        }

        private BigQueryInsertRow MapToRow(IndianaEvent e) => new()
        {
            { "LocationIdentifier", e.LocationIdentifier },
            { "Timestamp", e.Timestamp },
            { "EventCode", e.EventCode },
            { "EventParam", e.EventParam }
        };
    }
}
