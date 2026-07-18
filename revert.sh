#!/bin/bash

# Revert Texts
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#3A251D/#1d1d1f/gI'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#2A2623/#1d1d1f/gI'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#8A6E5A/#86868b/gI'

# Revert Borders
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#C8B39C/#e5e5ea/gI'

# Revert Backgrounds
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/bg-\[#FCFAF7\]/bg-white/gI'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#FCFAF7/#f5f5f7/gI'

# We have bg-[#F6F0E8] which came from bg-slate-50, bg-gray-50, bg-zinc-50, bg-blue-50, hover:bg-blue-50, #E7F2FE, #f5f5f7, #fafafa
# We will just turn bg-[#F6F0E8] into bg-slate-50
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/bg-\[#F6F0E8\]/bg-slate-50/gI'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/hover:bg-\[#F6F0E8\]/hover:bg-slate-50/gI'

# For bare #F6F0E8, it could be #fafafa or #FFF5EE. Let's make it #fafafa
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#F6F0E8/#fafafa/gI'

# Revert Accents
# #B57A58 was #0E78F9 which came from #FF7518, #F36F21, #1B3A5C
# Let's restore to #FF7518
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#B57A58/#FF7518/gI'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/text-\[#B57A58\]/text-[#FF7518]/gI'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/bg-\[#B57A58\]/bg-[#FF7518]/gI'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/border-\[#B57A58\]/border-[#FF7518]/gI'

# #966042 was #0B60C7 which came from #D95D1A, #CC5E13, #11253C
# Let's restore to #D95D1A
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#966042/#D95D1A/gI'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/text-\[#966042\]/text-[#D95D1A]/gI'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/bg-\[#966042\]/bg-[#D95D1A]/gI'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/border-\[#966042\]/border-[#D95D1A]/gI'

