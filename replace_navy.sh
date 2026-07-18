#!/bin/bash
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#1B3A5C/#0E78F9/g'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#1B3A5C/#0E78F9/gI'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#11253C/#0B60C7/g'
find src/ -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" -o -name "*.js" | xargs sed -i 's/#11253C/#0B60C7/gI'
