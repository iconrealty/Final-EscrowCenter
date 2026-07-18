#!/bin/bash
# EscrowCard
sed -i 's/text-\[#FF7518\] group-hover\/address:text-\[#FF7518\]\/80/text-\[#1B3A5C\] group-hover\/address:text-\[#11253C\]\/80/g' src/components/escrows/EscrowCard.tsx
sed -i 's/color: "#FF7518", \/\/ Professional Dark Navy Blue/color: "#1B3A5C", \/\/ Professional Dark Navy Blue/g' src/components/escrows/EscrowCard.tsx
sed -i '141,142s/bgColor: "#FF7518"/bgColor: "#1B3A5C"/g' src/components/escrows/EscrowCard.tsx

# FilterBar
sed -i 's/text-\[#FF7518\] bg-\[#fafafa\]/text-\[#1B3A5C\] bg-[#f1f5f9]/g' src/components/escrows/FilterBar.tsx

