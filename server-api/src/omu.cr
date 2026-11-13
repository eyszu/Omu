require "./omu/app"

# Read .env from the working directory (if present) before anything looks at ENV.
Omu::Config.load_dotenv

# Usage:
#   omu            start the API server (runs pending migrations first unless AUTO_MIGRATE=false)
#   omu migrate    apply pending migrations and exit
case ARGV.first?
when "migrate"
  applied = Omu::Migrations.run
  puts applied.empty? ? "Database is up to date." : "Applied: #{applied.join(", ")}"
when nil
  if Omu::Config.auto_migrate?
    applied = Omu::Migrations.run
    puts "Applied migrations: #{applied.join(", ")}" unless applied.empty?
  end
  Omu.build_app.listen(Omu::Config.port, Omu::Config.host)
else
  STDERR.puts "Unknown command '#{ARGV.first}'. Use: omu | omu migrate"
  exit 1
end
