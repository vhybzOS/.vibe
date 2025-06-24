#!/bin/bash
# Build all tree-sitter grammars

set -e

echo "Building all tree-sitter grammars..."

# Build pseudo-typescript grammar
echo "Building pseudo-typescript grammar..."
cd pseudo-typescript
tree-sitter generate
cd ..

# Build specs grammar  
echo "Building specs grammar..."
cd specs
tree-sitter generate
cd ..

echo "All grammars built successfully!"
echo ""
echo "To test grammars:"
echo "  cd pseudo-typescript && tree-sitter test"
echo "  cd specs && tree-sitter test"