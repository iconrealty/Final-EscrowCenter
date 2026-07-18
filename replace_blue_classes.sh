#!/bin/bash

# Replace text, bg, border utility classes
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/text-blue-500/text-\[#B57A58\]/g'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/bg-blue-500/bg-\[#B57A58\]/g'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/border-blue-500/border-\[#B57A58\]/g'

find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/text-blue-600/text-\[#966042\]/g'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/bg-blue-600/bg-\[#966042\]/g'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/border-blue-600/border-\[#966042\]/g'

find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/text-blue-50/text-\[#F6F0E8\]/g'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/bg-blue-50/bg-\[#F6F0E8\]/g'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/hover:bg-blue-50/hover:bg-\[#F6F0E8\]/g'

