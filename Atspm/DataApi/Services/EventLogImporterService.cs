using Polly;
using Polly.Contrib.WaitAndRetry;
using Polly.Retry;
using Utah.Udot.Atspm.Data;
using Utah.Udot.Atspm.Data.Enums;
using Utah.Udot.Atspm.Repositories.ConfigurationRepositories;

namespace Utah.Udot.ATSPM.DataApi.Services
{
    public class EventLogImporterService
    {
        private readonly AsyncRetryPolicy _retryPolicy = Policy
            .Handle<Exception>()
            .WaitAndRetryAsync(
                sleepDurations: Backoff.DecorrelatedJitterBackoffV2(
                    TimeSpan.FromSeconds(10),
                    retryCount: 5
                )
                .Concat(new[]
                {
                    TimeSpan.FromMinutes(5),
                    TimeSpan.FromMinutes(30)
                })
                .Concat(Enumerable.Repeat(TimeSpan.FromDays(1), 24)),
                onRetry: (exception, timeSpan, retryCount, context) =>
                {
                    Console.WriteLine($"Retry {retryCount} after {timeSpan.TotalSeconds} seconds due to {exception.Message}");
                });
        private readonly IServiceProvider _serviceProvider;
        private ILocationRepository _locationRepository;

        public EventLogImporterService(AsyncRetryPolicy retryPolicy, IServiceProvider serviceProvider, ILocationRepository locationRepository)
        {
            _retryPolicy = retryPolicy;
            _serviceProvider = serviceProvider;
            _locationRepository = locationRepository;
        }

        public CompressedEventLogs<IndianaEvent> CompressEvents(string locationIdentifier, List<IndianaEvent> events)
        {
            var location = _locationRepository.GetLatestVersionOfLocation(locationIdentifier);
            if (events.Any())
            {
                var device = location.Devices
                    .FirstOrDefault(d => d.DeviceType == DeviceTypes.SignalController);

                events.OrderBy(i => i.Timestamp);
                DateTime start = events.First().Timestamp;
                DateTime end = events.Last().Timestamp;
                if (device != null)
                {
                    return new CompressedEventLogs<IndianaEvent>
                    {
                        LocationIdentifier = locationIdentifier,
                        DeviceId = device.Id,
                        ArchiveDate = DateOnly.FromDateTime(start),
                        Start = start,
                        End = end,
                        Data = events
                    };
                }
                else { return null; }

            }
            else { return null; }
        }



        public async Task InsertLogWithRetryAsync(CompressedEventLogs<IndianaEvent> archiveLogs)
        {
            await _retryPolicy.ExecuteAsync(async () =>
            {
                using var scope = _serviceProvider.CreateScope();
                var context = scope.ServiceProvider.GetService<EventLogContext>();
                if (context == null)
                {
                    return;
                }
                context.CompressedEvents.AddRange(archiveLogs);
                //context.CompressedEvents.Add(archiveLog);
                await context.SaveChangesAsync();
            });
        }
    }
}
