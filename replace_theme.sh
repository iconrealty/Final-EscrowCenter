#!/bin/bash

# Accents
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#0E78F9/#B57A58/gI'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#0B60C7/#966042/gI'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#E7F2FE/#F6F0E8/gI'

# Texts
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#1d1d1f/#2A2623/gI'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#86868b/#8A6E5A/gI'

# Backgrounds
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/bg-white/bg-\[#FCFAF7\]/g'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/bg-slate-50/bg-\[#F6F0E8\]/g'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/bg-gray-50/bg-\[#F6F0E8\]/g'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/bg-zinc-50/bg-\[#F6F0E8\]/g'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#f5f5f7/#F6F0E8/gI'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#fafafa/#F6F0E8/gI'

# Borders
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#e5e5ea/#C8B39C/gI'

# Update index.css explicitly for variables
sed -i 's/--color-app-bg: #FCFAF7;/--color-app-bg: #FCFAF7;/g' src/index.css
# But wait, index.css had #f5f5f7 for app-bg, which is now replaced to #F6F0E8.
# Let's fix index.css app-bg to Off White (#FCFAF7)
sed -i 's/--color-app-bg: #F6F0E8;/--color-app-bg: #FCFAF7;/g' src/index.css

