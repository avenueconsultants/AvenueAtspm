using DatabaseInstaller.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.CommandLine;
using System.CommandLine.Hosting;
using System.CommandLine.NamingConventionBinder;

namespace DatabaseInstaller.Commands
{
    public class TransferConfigFromCsvCommand : Command, ICommandOption<CopyFromCsvConfiguration>
    {
        public TransferConfigFromCsvCommand()
        : base("copy-config-csv", "Copy Config Data for new data format in a Postgres database")
        {

            AddOption(TargetConnectionStringOption);
            AddOption(SignalsFilePathOption);
            AddOption(ApproachesFilePathOption);
            AddOption(DetectorsFilePathOption);
            AddOption(DetectionTypeDetectorFilePathOption);
        }

        public Option<string> TargetConnectionStringOption { get; set; } = new("--target-connection", "Target database connection string");
        public Option<string> SignalsFilePathOption { get; set; } = new("--signals-file", "Path to the Signals.csv file");
        public Option<string> ApproachesFilePathOption { get; set; } = new("--approaches-file", "Path to the Approaches.csv file");
        public Option<string> DetectorsFilePathOption { get; set; } = new("--detectors-file", "Path to the Detectors.csv file");
        public Option<string> DetectionTypeDetectorFilePathOption { get; set; } = new("--detection-type-detector-file", "Path to the DetectionTypeDetector.csv file");

        public ModelBinder<CopyFromCsvConfiguration> GetOptionsBinder()
        {
            var binder = new ModelBinder<CopyFromCsvConfiguration>();
            binder.BindMemberFromValue(b => b.TargetConnectionString, TargetConnectionStringOption);
            binder.BindMemberFromValue(b => b.LocationsFilePath, SignalsFilePathOption);
            binder.BindMemberFromValue(b => b.ApproachesFilePath, ApproachesFilePathOption);
            binder.BindMemberFromValue(b => b.DetectorsFilePath, DetectorsFilePathOption);
            binder.BindMemberFromValue(b => b.DetectionTypeDetectorFilePath, DetectionTypeDetectorFilePathOption);
            return binder;
        }

        public void BindCommandOptions(HostBuilderContext host, IServiceCollection services)
        {
            services.AddSingleton(GetOptionsBinder());
            services.AddOptions<CopyFromCsvConfiguration>().BindCommandLine();
            services.AddHostedService<TransferConfigFromCsvHostedService>();
        }

    }

    public class CopyFromCsvConfiguration
    {
        public string TargetConnectionString { get; set; }
        public string LocationsFilePath { get; set; }
        public string ApproachesFilePath { get; set; }
        public string DetectorsFilePath { get; set; }
        public string DetectionTypeDetectorFilePath { get; set; }
    }
}
