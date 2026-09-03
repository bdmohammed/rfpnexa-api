import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

const relationDecorators = new Set(['ManyToOne', 'OneToMany', 'OneToOne', 'ManyToMany']);

for (const sourceFile of project.addSourceFilesAtPaths('src/database/entities/**/*.ts')) {
  let modified = false;

  // Find the typeorm import
  const typeormImport = sourceFile.getImportDeclaration(
    (d) => d.getModuleSpecifierValue() === 'typeorm',
  );

  if (!typeormImport) continue;

  const namedImports = typeormImport.getNamedImports();

  const hasRelationImport = namedImports.some((i) => i.getName() === 'Relation');

  for (const cls of sourceFile.getClasses()) {
    for (const property of cls.getProperties()) {
      const decorators = property.getDecorators();

      const isRelation = decorators.some((d) => relationDecorators.has(d.getName()));

      if (!isRelation) continue;

      const typeNode = property.getTypeNode();

      if (!typeNode) continue;

      const text = typeNode.getText();

      if (text.startsWith('Relation<') || text.startsWith('Promise<')) {
        continue;
      }

      property.setType(`Relation<${text}>`);
      modified = true;
    }
  }

  if (modified && !hasRelationImport) {
    typeormImport.addNamedImport('Relation');
  }

  if (modified) {
    console.log(`✔ ${sourceFile.getBaseName()}`);
  }
}

project.saveSync();

console.log('Done.');
