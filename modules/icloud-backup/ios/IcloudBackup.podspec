Pod::Spec.new do |s|
  s.name           = 'IcloudBackup'
  s.version        = '1.0.0'
  s.summary        = 'Copy Trade Report backup zips into the app iCloud Drive container'
  s.description    = 'Native iOS helper that writes a zip into this app ubiquity Documents folder.'
  s.author         = 'Trade Report'
  s.homepage       = 'https://tradereportapp.com'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => 'https://github.com/placeholder/icloud-backup.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.{h,m,mm,swift}'
end
