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
using DatabaseInstaller.Services;
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
using System.Text.Json;
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
    .ConfigureAppConfiguration((h, c) =>
    {
        c.AddUserSecrets<Program>(optional: true); // Load secrets first
        c.AddCommandLine(args);                    // Override with command-line args

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
            var transferOptions = sp.GetRequiredService<IOptions<TransferCommandConfiguration>>().Value;
            var credentialsPath = ResolveCredentialsPath(config, transferOptions);
            var projectId = ResolveProjectId(opts, credentialsPath);

            var credential = GoogleCredential.FromFile(credentialsPath);
            return BigQueryClient.Create(projectId, credential);
        });

        // Register Google Cloud StorageClient
        services.AddSingleton(sp =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            var transferOptions = sp.GetRequiredService<IOptions<TransferCommandConfiguration>>().Value;
            var credentialsPath = ResolveCredentialsPath(config, transferOptions);
            var credential = GoogleCredential.FromFile(credentialsPath);
            return StorageClient.Create(credential);
        });

        // BigQuery repositories
        services.AddScoped<IIndianaEventLogBQRepository, IndianaEventLogBQRepository>();
        services.AddScoped<ISpeedEventLogBQRepository, SpeedEventLogBQRepository>();

        // Hosted services
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

static string ResolveCredentialsPath(IConfiguration config, TransferCommandConfiguration transferOptions)
{
    var credentialsPath = !string.IsNullOrWhiteSpace(transferOptions.CredentialsFile)
        ? transferOptions.CredentialsFile
        : config.GetValue<string>("BigQuery:CredentialsFile");

    if (string.IsNullOrWhiteSpace(credentialsPath))
    {
        throw new InvalidOperationException(
            "Google credentials file path is required. Set --credentials-file or BigQuery:CredentialsFile.");
    }

    if (!File.Exists(credentialsPath))
    {
        throw new FileNotFoundException($"Google credentials file was not found at '{credentialsPath}'.", credentialsPath);
    }

    return credentialsPath;
}

static string ResolveProjectId(BigQueryOptions options, string credentialsPath)
{
    if (!string.IsNullOrWhiteSpace(options.ProjectId))
    {
        return options.ProjectId;
    }

    using var json = JsonDocument.Parse(File.ReadAllText(credentialsPath));
    if (json.RootElement.TryGetProperty("project_id", out var projectIdElement))
    {
        var projectId = projectIdElement.GetString();
        if (!string.IsNullOrWhiteSpace(projectId))
        {
            return projectId;
        }
    }

    throw new InvalidOperationException(
        "BigQuery project id is missing. Set BigQuery:ProjectId or provide a credentials file containing project_id.");
}