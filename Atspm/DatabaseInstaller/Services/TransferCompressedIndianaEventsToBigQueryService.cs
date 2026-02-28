using DatabaseInstaller.Commands;
using Google.Cloud.BigQuery.V2;
using Google.Cloud.Storage.V1;
using Google.Apis.Bigquery.v2.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System.IO.Compression;
using System.Text;
using Utah.Udot.Atspm.Data.Models.EventLogModels;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;
using Utah.Udot.Atspm.Data.Models;

namespace DatabaseInstaller.Services;

public class TransferCompressedIndianaEventsToBigQueryService : TransferEventLogsToBigQueryBase<IndianaEventDto>
{
    private const string TransferEventsFormat = "transfer-events";
    private const string TranslateEventsFormat = "translate-events";
    private const string UncompressedFormat = "uncompressed";

    private readonly string _table = "IndianaEventLogs";
    private readonly TransferCommandConfiguration _config;

    public TransferCompressedIndianaEventsToBigQueryService(
        ILogger<TransferCompressedIndianaEventsToBigQueryService> logger,
        ILocationRepository locationRepository,
        IOptions<TransferCommandConfiguration> config,
        BigQueryClient client,
        StorageClient storageClient)
        : base(client, storageClient, logger, locationRepository, config)
    {
        _config = config.Value;
    }

    protected override string TableName => _table;

    protected override TableSchema GetSchema() => new TableSchemaBuilder
    {
        { "LocationIdentifier", BigQueryDbType.String, BigQueryFieldMode.Required },
        { "Timestamp", BigQueryDbType.DateTime, BigQueryFieldMode.Required },
        { "EventCode", BigQueryDbType.Int64, BigQueryFieldMode.Required },
        { "EventParam", BigQueryDbType.Int64, BigQueryFieldMode.Required }
    }.Build();

    protected override async Task<List<IndianaEventDto>> GetEventsAsync(string locationId, DateTime day)
    {
        return await _retryPolicy.ExecuteAsync(async () =>
        {
            var storageFormat = (_config.StorageFormat ?? TranslateEventsFormat).Trim().ToLowerInvariant();

            return storageFormat switch
            {
                TransferEventsFormat => await GetTransferEventsStyleEventsAsync(locationId, day),
                TranslateEventsFormat => await GetArchiveEventsAsync(locationId, day, isCompressed: true),
                UncompressedFormat => await GetArchiveEventsAsync(locationId, day, isCompressed: false),
                _ => throw new InvalidOperationException(
                    $"Unsupported storage format '{_config.StorageFormat}'. " +
                    $"Supported values: {TransferEventsFormat}, {TranslateEventsFormat}, {UncompressedFormat}.")
            };
        });
    }

    private async Task<List<IndianaEventDto>> GetTransferEventsStyleEventsAsync(string locationId, DateTime day)
    {
        var events = new List<IndianaEventDto>();
        const string query = @"
            SELECT [Timestamp], [EventCode], [EventParam]
            FROM [dbo].[Controller_Event_Log]
            WHERE [SignalId] = @SignalId
              AND [Timestamp] >= @StartUtc
              AND [Timestamp] < @EndUtc";

        using var conn = new SqlConnection(_config.Source);
        await conn.OpenAsync();

        using var cmd = new SqlCommand(query, conn);
        cmd.Parameters.AddWithValue("@SignalId", locationId);
        cmd.Parameters.AddWithValue("@StartUtc", day);
        cmd.Parameters.AddWithValue("@EndUtc", day.AddDays(1));

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            events.Add(new IndianaEventDto
            {
                LocationIdentifier = locationId,
                Timestamp = reader.GetDateTime(reader.GetOrdinal("Timestamp")),
                EventCode = Convert.ToInt32(reader["EventCode"]),
                EventParam = Convert.ToInt32(reader["EventParam"])
            });
        }

        return events;
    }

    private async Task<List<IndianaEventDto>> GetArchiveEventsAsync(string locationId, DateTime day, bool isCompressed)
    {
        var events = new List<IndianaEventDto>();
        const string query = @"
            SELECT LogData FROM [dbo].[ControllerLogArchives]
            WHERE SignalId = @SignalId AND ArchiveDate = @Date";

        using var conn = new SqlConnection(_config.Source);
        await conn.OpenAsync();

        using var cmd = new SqlCommand(query, conn);
        cmd.Parameters.AddWithValue("@SignalId", locationId);
        cmd.Parameters.AddWithValue("@Date", day.Date);

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var json = await ReadArchiveJsonAsync(reader, isCompressed);
            var rawEvents = JsonConvert.DeserializeObject<List<ControllerEventLog>>(json) ?? new List<ControllerEventLog>();

            events.AddRange(rawEvents.Select(e => new IndianaEventDto
            {
                LocationIdentifier = locationId,
                Timestamp = e.Timestamp,
                EventCode = e.EventCode,
                EventParam = e.EventParam
            }));
        }

        return events;
    }

    private static async Task<string> ReadArchiveJsonAsync(SqlDataReader reader, bool isCompressed)
    {
        if (reader["LogData"] is string jsonText)
        {
            return jsonText;
        }

        if (reader["LogData"] is not byte[] payload)
        {
            throw new InvalidOperationException("ControllerLogArchives.LogData is not a supported type.");
        }

        if (!isCompressed)
        {
            return Encoding.UTF8.GetString(payload);
        }

        using var input = new MemoryStream(payload);
        using var gzip = new GZipStream(input, CompressionMode.Decompress);
        using var output = new MemoryStream();
        await gzip.CopyToAsync(output);

        return Encoding.UTF8.GetString(output.ToArray());
    }
}