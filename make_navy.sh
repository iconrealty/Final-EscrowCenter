#!/bin/bash
find src/ -type f -name "*.tsx" | xargs sed -i 's/#F36F21/#1B3A5C/g'
find src/ -type f -name "*.tsx" | xargs sed -i 's/#D95D1A/#11253C/g'
find src/ -type f -name "*.tsx" | xargs sed -i 's/#FFF5EE/#f1f5f9/g'

sed -i 's/#F36F21/#1B3A5C/g' src/index.css
sed -i 's/#D95D1A/#11253C/g' src/index.css
sed -i 's/#FFF5EE/#f1f5f9/g' src/index.css
