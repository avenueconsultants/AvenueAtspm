#region license
// Copyright 2025 Utah Departement of Transportation
// for ReportApi - Utah.Udot.Atspm.ReportApi.ReportServices/ApproachDelayReportService.cs
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

using Utah.Udot.Atspm.Data.Models.AggregationModels;

namespace Utah.Udot.Atspm.ReportApi.ReportServices
{
    /// <summary>
    /// Approach delay report service
    /// </summary>
    public class PedestrianAggregationService : ReportServiceBase<PedatLocationDataQuery, IEnumerable<PedatLocationData>>
    {
        private readonly ILocationRepository _LocationRepository;
        private readonly IPhasePedAggregationRepository _PhasePedAggregationRepository;
        private readonly IPhaseCycleAggregationRepository _PhaseCycleAggregationRepository;
        private readonly IIndianaEventLogRepository _controllerEventLogRepository;
        private readonly PhaseService _phaseService;

        /// <inheritdoc/>
        public PedestrianAggregationService(
            LocationPhaseService LocationPhaseService,
            ILocationRepository LocationRepository,
            IPhasePedAggregationRepository PhasePedAggregationRepository,
            IPhaseCycleAggregationRepository PhaseCycleAggregationRepository,
            IIndianaEventLogRepository controllerEventLogRepository,
            PhaseService phaseService
            )
        {
            _LocationRepository = LocationRepository;
            _controllerEventLogRepository = controllerEventLogRepository;
            _PhaseCycleAggregationRepository = PhaseCycleAggregationRepository;
            _PhasePedAggregationRepository = PhasePedAggregationRepository;
            _phaseService = phaseService;
        }

        /// <inheritdoc/>
        public override async Task<IEnumerable<PedatLocationData>> ExecuteAsync(PedatLocationDataQuery parameter, IProgress<int> progress = null, CancellationToken cancelToken = default)
        {
            var locations = new List<Location>();
            var pedatLocations = new List<PedatLocationData>();
            if (parameter == null || parameter.EndDate == null || parameter.StartDate == null || parameter.LocationIdentifiers == null)
            {
                return pedatLocations;
            }
            if (parameter.TimeUnit == null)
            {
                parameter.TimeUnit = PedestrianTimeUnit.Hour;
            }

            foreach (var locationId in parameter.LocationIdentifiers)
            {
                Location location = _LocationRepository.GetLatestVersionOfLocation(locationId, parameter.StartDate);
                locations.Add(location);
            }
            if (locations.IsNullOrEmpty())
            {
                return await Task.FromException<IEnumerable<PedatLocationData>>(new NullReferenceException("Location not found"));
            }
            foreach (var location in locations)
            {
                var phasePedAggEvent = _PhasePedAggregationRepository.GetAggregationsBetweenDates(location.LocationIdentifier, parameter.StartDate, parameter.EndDate);
                var phaseCycleAggEvent = _PhaseCycleAggregationRepository.GetAggregationsBetweenDates(location.LocationIdentifier, parameter.StartDate, parameter.EndDate);

                var cycleDict = phaseCycleAggEvent
                    .GroupBy(c => new DateTime(c.Start.Year, c.Start.Month, c.Start.Day, c.Start.Hour, 0, 0))
                    .SelectMany(g => g.GroupBy(c => c.PhaseNumber)
                                      .Select(pg => new
                                      {
                                          Key = (Hour: g.Key, Phase: pg.Key),
                                          Sum = pg.Sum(c => c.PhaseBeginCount)
                                      }))
                    .ToDictionary(x => x.Key, x => x.Sum);

                var pedWalk = phasePedAggEvent.Sum(i => i.PedBeginWalkCount);
                var pedCallsRegisered = phasePedAggEvent.Sum(i => i.ImputedPedCallsRegistered);
                bool recall = pedWalk >= pedCallsRegisered;

                var cycleLength = 0; //Verify this is what we want to do in the case where the cycles dont exist
                if (!phaseCycleAggEvent.IsNullOrEmpty())
                {
                    var allCycles = phaseCycleAggEvent.Sum(i => i.PhaseBeginCount);
                    var totalMinutes = (int)(phaseCycleAggEvent.Max(p => p.End) - phaseCycleAggEvent.Min(p => p.Start)).TotalMinutes;
                    cycleLength = totalMinutes / allCycles;
                }
                var totalDays = 1;
                if (!phasePedAggEvent.IsNullOrEmpty())
                {
                    totalDays = (int)(phasePedAggEvent.Max(p => p.End) - phasePedAggEvent.Min(p => p.Start)).TotalDays;
                    if (totalDays == 0)
                        totalDays = 1;
                }

                var activity = phasePedAggEvent.Sum(i => i.ImputedPedCallsRegistered) / totalDays;

                var combinedHourly = phasePedAggEvent
                    .GroupBy(p => new { Hour = new DateTime(p.Start.Year, p.Start.Month, p.Start.Day, p.Start.Hour, 0, 0), p.PhaseNumber })
                    .Select(g =>
                    {
                        var pedSumUnique = g.Sum(x => x.UniquePedDetections);
                        var pedSumCalls = g.Sum(x => x.ImputedPedCallsRegistered);

                        // Lookup cycle sum in O(1)
                        cycleDict.TryGetValue((g.Key.Hour, g.Key.PhaseNumber), out var cycleSum);

                        var volume = EquationCalculation(recall, cycleLength, activity, pedSumCalls, pedSumUnique);

                        return new CombinedHourlyAggregation
                        {
                            TimeStamp = g.Key.Hour,
                            PhaseNumber = g.Key.PhaseNumber,
                            UniquePedDetections = pedSumUnique,
                            ImputedPedCallsRegistered = pedSumCalls,
                            PhaseBeginCount = cycleSum,
                            Time = 60,
                            CalculatedVolume = volume
                        };
                    })
                    .ToList();

                List<RawDataPoint> rawData = RawDataSwap(parameter, combinedHourly);
                var pedStats = CalculateStatistics(rawData, parameter.StartDate, parameter.EndDate, GetInterval(parameter.TimeUnit));

                var averageVolumeByHourOfDay = AverageVolumeByHour(combinedHourly);
                var averageVolumeByDayOfWeek = AverageVolumeByDayOfWeek(combinedHourly);
                var averageVolumeByMonthOfYear = AverageVolumeByMonth(combinedHourly);
                var averageDailyVolume = AverageVolumeOverall(combinedHourly);
                var totalVolume = combinedHourly.Sum(i => i.CalculatedVolume);

                string areas = location.Areas != null ? string.Join(", ", location.Areas.Select(a => a.Name)) : string.Empty;

                var pedatLocationData = new PedatLocationData
                {
                    LocationIdentifier = location.LocationIdentifier,
                    Names = location.PrimaryName + " & " + location.SecondaryName,
                    Areas = areas,
                    Latitude = location.Latitude,
                    Longitude = location.Longitude,
                    TotalVolume = totalVolume,
                    AverageDailyVolume = averageDailyVolume,
                    AverageVolumeByHourOfDay = averageVolumeByHourOfDay,
                    AverageVolumeByDayOfWeek = averageVolumeByDayOfWeek,
                    AverageVolumeByMonthOfYear = averageVolumeByMonthOfYear,
                    RawData = rawData,
                    StatisticData = pedStats
                };
                pedatLocations.Add(pedatLocationData);
            }
            return pedatLocations;
        }

        public StatisticsDataPoint CalculateStatistics(List<RawDataPoint> rawData, DateTime start, DateTime end, TimeSpan interval)
        {
            if (rawData == null || rawData.Count == 0)
                return new StatisticsDataPoint(); // all nulls

            var values = rawData
                .Where(r => r.PedestrianCount.HasValue)
                .Select(r => (double)r.PedestrianCount.Value)
                .OrderBy(v => v)
                .ToList();

            var expectedTimes = new HashSet<DateTime>();
            for (var t = start; t <= end; t = t.Add(interval))
                expectedTimes.Add(t);

            // Actual timestamps that have data
            var actualTimes = new HashSet<DateTime>(rawData.Select(r => r.TimeStamp));

            // Missing timestamps
            int missingCount = expectedTimes.Count - actualTimes.Count;

            double count = values.Sum(i => i);

            double mean = values.Average();
            double std = Math.Sqrt(values.Sum(v => Math.Pow(v - mean, 2)) / count);
            double min = values.First();
            double max = values.Last();

            double Percentile(List<double> sortedValues, double p)
            {
                if (sortedValues.Count == 0) return double.NaN;
                double pos = (sortedValues.Count - 1) * p;
                int index = (int)pos;
                double frac = pos - index;
                if (index + 1 < sortedValues.Count)
                    return sortedValues[index] + frac * (sortedValues[index + 1] - sortedValues[index]);
                return sortedValues[index];
            }

            return new StatisticsDataPoint
            {
                Events = rawData.Count(),
                Count = count,
                MissingCount = 0,
                Mean = Math.Round(mean),
                Std = Math.Round(std),
                Min = Math.Round(min),
                Max = Math.Round(max),
                TwentyFifthPercentile = Math.Round(Percentile(values, 0.25)),
                FiftyithPercentile = Math.Round(Percentile(values, 0.5)),
                SeventyFifthPercentile = Math.Round(Percentile(values, 0.75))
            };
        }

        private List<RawDataPoint> RawDataSwap(PedatLocationDataQuery parameter, List<CombinedHourlyAggregation> combinedHourly)
        {
            switch (parameter.TimeUnit)
            {
                case PedestrianTimeUnit.Day:
                    return combinedHourly
                        .GroupBy(p => p.TimeStamp.Date)
                        .Select(g => new RawDataPoint
                        {
                            TimeStamp = g.Key,
                            PedestrianCount = g.Sum(x => x.CalculatedVolume)
                        })
                        .OrderBy(d => d.TimeStamp)
                        .ToList();

                case PedestrianTimeUnit.Week:
                    return combinedHourly
                        .GroupBy(p =>
                        {
                            var diff = (int)p.TimeStamp.DayOfWeek - (int)DayOfWeek.Monday;
                            if (diff < 0) diff += 7; // ISO Monday = 0
                            var monday = p.TimeStamp.AddDays(-diff).Date;
                            return monday; // group by start of week
                        })
                        .Select(g => new RawDataPoint
                        {
                            TimeStamp = g.Key,
                            PedestrianCount = g.Sum(x => x.CalculatedVolume)
                        })
                        .OrderBy(d => d.TimeStamp)
                        .ToList();

                case PedestrianTimeUnit.Month:
                    return combinedHourly
                        .GroupBy(p => new DateTime(p.TimeStamp.Year, p.TimeStamp.Month, 1))
                        .Select(g => new RawDataPoint
                        {
                            TimeStamp = g.Key,
                            PedestrianCount = g.Sum(x => x.CalculatedVolume)
                        })
                        .OrderBy(d => d.TimeStamp)
                        .ToList();

                case PedestrianTimeUnit.Year:
                    return combinedHourly
                        .GroupBy(p => new DateTime(p.TimeStamp.Year, 1, 1))
                        .Select(g => new RawDataPoint
                        {
                            TimeStamp = g.Key,
                            PedestrianCount = g.Sum(x => x.CalculatedVolume)
                        })
                        .OrderBy(d => d.TimeStamp)
                        .ToList();

                default: // Hour
                    return combinedHourly
                        .GroupBy(p => new DateTime(p.TimeStamp.Year, p.TimeStamp.Month, p.TimeStamp.Day, p.TimeStamp.Hour, 0, 0))
                        .Select(g => new RawDataPoint
                        {
                            TimeStamp = g.Key,
                            PedestrianCount = g.Sum(x => x.CalculatedVolume)
                        })
                        .OrderBy(d => d.TimeStamp)
                        .ToList();
            }
        }

        private TimeSpan GetInterval(PedestrianTimeUnit timeUnit)
        {
            return timeUnit switch
            {
                PedestrianTimeUnit.Hour => TimeSpan.FromHours(1),
                PedestrianTimeUnit.Day => TimeSpan.FromDays(1),
                PedestrianTimeUnit.Week => TimeSpan.FromDays(7),
                PedestrianTimeUnit.Month => TimeSpan.FromDays(30),  // approximate
                PedestrianTimeUnit.Year => TimeSpan.FromDays(365),  // approximate
                _ => throw new ArgumentOutOfRangeException(nameof(timeUnit), timeUnit, null)
            };
        }

        private double EquationCalculation(bool recall, int cycleLength, int activity, int FortyFiveB, int NintyC)
        {
            if (recall)
            {
                if (activity > 350)
                {
                    return 2.304 * FortyFiveB + 0.148 * (FortyFiveB * FortyFiveB);

                }
                else
                {
                    return 1.31 * FortyFiveB + 0.083 * (FortyFiveB * FortyFiveB);
                }
            }
            else
            {
                if (cycleLength < 1.5)
                {
                    return 1.215 * NintyC + 4.292 * Math.Max(NintyC - 28, 0);

                }
                else
                {
                    return 1.215 * NintyC + 7.214 * Math.Max(NintyC - 28, 0);

                }
            }
        }

        private List<IndexedVolume> AverageVolumeByHour(List<CombinedHourlyAggregation> combinedHourly)
        {
            var allHours = combinedHourly.Select(p => p.TimeStamp)
                .Select(h => h.Hour)           // get 0–23 hour of day
                .Distinct()
                .OrderBy(h => h)
                .ToList();

            List<IndexedVolume> hourlyRatios = allHours
                .Select(hour =>
                {
                    var volume = combinedHourly
                        .Where(p => p.TimeStamp.Hour == hour)
                        .Sum(p => p.CalculatedVolume);

                    return new IndexedVolume
                    {
                        Index = hour,   // 0–23
                        Volume = volume
                    };
                })
                .ToList();

            return hourlyRatios;
        }

        private List<IndexedVolume> AverageVolumeByDayOfWeek(List<CombinedHourlyAggregation> combinedHourly)
        {
            // Get all days of week present in the data
            var allDays = combinedHourly.Select(p => (int)p.TimeStamp.DayOfWeek)
                            .Distinct()
                            .OrderBy(d => d)
                            .ToList();

            // Convert .NET DayOfWeek (0=Sunday, 1=Monday, ...) to ISO 1=Monday,...7=Sunday
            int ToIsoDay(int dotNetDay) => dotNetDay == 0 ? 7 : dotNetDay;

            List<IndexedVolume> dailyRatios = allDays
                .Select(day =>
                {
                    int isoDay = ToIsoDay(day);

                    // Sum across all hours/phases for this day
                    var volume = combinedHourly
                        .Where(p => ToIsoDay((int)p.TimeStamp.DayOfWeek) == isoDay)
                        .Sum(p => p.CalculatedVolume);

                    return new IndexedVolume
                    {
                        Index = isoDay,   // 1=Monday ... 7=Sunday
                        Volume = volume
                    };
                })
                .ToList();

            return dailyRatios;
        }

        private List<IndexedVolume> AverageVolumeByMonth(List<CombinedHourlyAggregation> combinedHourly)
        {
            // Get all months present in the data
            var allMonths = combinedHourly.Select(p => p.TimeStamp.Month)
                            .Distinct()
                            .OrderBy(m => m)
                            .ToList();

            List<IndexedVolume> monthlyRatios = allMonths
                .Select(month =>
                {
                    // Sum across all days/hours/phases for this month
                    var volume = combinedHourly
                        .Where(p => p.TimeStamp.Month == month)
                        .Sum(p => p.CalculatedVolume);

                    return new IndexedVolume
                    {
                        Index = month,   // 1 = January ... 12 = December
                        Volume = volume
                    };
                })
                .ToList();

            return monthlyRatios;
        }

        private double AverageVolumeOverall(List<CombinedHourlyAggregation> combinedHourly)
        {
            // Group by date (ignore time)
            var dailySums = combinedHourly
                .GroupBy(i => i.TimeStamp.Date)
                .Select(g => g.Sum(x => x.CalculatedVolume));

            // Compute the average across all days
            return dailySums.Any() ? dailySums.Average() : 0;
        }

        private class CombinedHourlyAggregation
        {
            public DateTime TimeStamp { get; set; }
            public int PhaseNumber { get; set; }

            // Pedestrian fields
            public int UniquePedDetections { get; set; }
            public int ImputedPedCallsRegistered { get; set; }

            // Cycle fields
            public int PhaseBeginCount { get; set; }
            public int Time { get; set; }
            public double CalculatedVolume { get; set; }
        }

    }
}
