#region license
// Copyright 2025 Utah Departement of Transportation
// for DatabaseInstaller - %Namespace%/Program.cs
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
using Google.Apis.Auth.OAuth2;
using Google.Cloud.BigQuery.V2;
using Google.Cloud.Storage.V1;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using System.CommandLine.Builder;
using System.CommandLine.Hosting;
using System.CommandLine.Parsing;
using Utah.Udot.Atspm.Business.Common;
using Utah.Udot.Atspm.Data;
using Utah.Udot.Atspm.Data.Models;
using Utah.Udot.Atspm.Infrastructure.Extensions;
using Utah.Udot.Atspm.Infrastructure.Repositories.EventLogRepositories;
using Utah.Udot.Atspm.Repositories.EventLogRepositories;
using Utah.Udot.Atspm.ValueObjects;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
var rootCmd = new DatabaseInstallerCommands();
var cmdBuilder = new CommandLineBuilder(rootCmd);
cmdBuilder.UseDefaults();
cmdBuilder.UseHost(hostBuilder =>
{
    return Host.CreateDefaultBuilder(hostBuilder)
    .ApplyVolumeConfiguration()
    //.UseConsoleLifetime()
    .ConfigureAppConfiguration((hostingContext, config) =>
    {
        var env = hostingContext.HostingEnvironment;

        config.SetBasePath(AppContext.BaseDirectory);
        config.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);
        config.AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true, reloadOnChange: true);
        config.AddUserSecrets<Program>(optional: true); // Optional: for local development
        config.AddEnvironmentVariables();               // Optional: useful for cloud/deployment
        config.AddCommandLine(args);                    // Highest precedence
    })

    //.ConfigureLogging((hostContext, logging) =>
    //{
    //    // Configure logging if needed
    //})
    .ConfigureServices((hostContext, services) =>
    {
        // Core ATSPM services
        services.AddAtspmDbContext(hostContext);
        services.AddAtspmEFConfigRepositories();
        services.AddAtspmEFEventLogRepositories();

        services.AddIdentity<ApplicationUser, IdentityRole>()
            .AddEntityFrameworkStores<IdentityContext>()
            .AddDefaultTokenProviders();

        // Configuration bindings
        services.Configure<UpdateCommandConfiguration>(hostContext.Configuration.GetSection("CommandLineOptions"));
        services.Configure<TransferDailyToHourlyConfiguration>(hostContext.Configuration.GetSection(nameof(TransferDailyToHourlyConfiguration)));
        services.Configure<TransferCommandConfiguration>(hostContext.Configuration.GetSection(nameof(TransferCommandConfiguration)));
        services.Configure<TransferConfigCommandConfiguration>(hostContext.Configuration.GetSection(nameof(TransferConfigCommandConfiguration)));
        services.Configure<BigQueryOptions>(hostContext.Configuration.GetSection("BigQuery"));

        // Register BigQueryClient with credentials
        services.AddSingleton(sp =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            var opts = sp.GetRequiredService<IOptions<BigQueryOptions>>().Value;
            var credentialsPath2 = config.GetValue<string>("BigQuery:CredentialsFile");
            var credentialsPath = config.GetValue<string>("GoogleApplicationCredentials");
            var credential = GoogleCredential.FromFile(credentialsPath2);
            return BigQueryClient.Create(opts.ProjectId, credential);
        });

        // Register Google Cloud StorageClient
        services.AddSingleton(sp =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            var credentialsPath2 = config.GetValue<string>("BigQuery:CredentialsFile");
            var credentialsPath = config.GetValue<string>("GoogleApplicationCredentials");
            var credential = GoogleCredential.FromFile(credentialsPath2);
            return StorageClient.Create(credential);
        });


        // BigQuery repositories
        services.AddScoped<IIndianaEventLogBQRepository, IndianaEventLogBQRepository>();
        services.AddScoped<ISpeedEventLogBQRepository, SpeedEventLogBQRepository>();
        services.AddScoped<CycleService>();
        services.AddScoped<AggregateSplitMonitorToBigQueryService>();
        services.AddScoped<AggregateSplitFailToBigQueryService>();
        services.AddScoped<AggregateSpeedsToBigQueryService>();

        // Hosted services
        services.AddScoped<AnalysisPhaseCollectionService>();
        services.AddScoped<AnalysisPhaseService>();
        services.AddScoped<CycleService>();
        services.AddScoped<PhaseService>();
        services.AddScoped<PlanService>();
    });
},
host =>
{
    var cmd = host.GetInvocationContext().ParseResult.CommandResult.Command;

    // Dynamically bind services for the specific command being executed
    host.ConfigureServices((context, services) =>
    {
        if (cmd is ICommandOption commandOption)
        {
            // Call the BindCommandOptions method for the command
            commandOption.BindCommandOptions(context, services);
        }
    });
});

// Build and invoke the command parser
var cmdParser = cmdBuilder.Build();
await cmdParser.InvokeAsync(args);