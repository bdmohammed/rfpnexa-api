import { Project, SyntaxKind } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

const sourceFiles = project.getSourceFiles("src/database/entities/**/*.ts");

for (const sourceFile of sourceFiles) {
  let changed = false;

  for (const property of sourceFile.getDescendantsOfKind(
    SyntaxKind.PropertyDeclaration,
  )) {
    // Only properties that have TypeORM decorators
    const decorators = property.getDecorators();

    const isTypeOrmProperty = decorators.some((decorator) =>
      [
        "Column",
        "PrimaryColumn",
        "PrimaryGeneratedColumn",
        "CreateDateColumn",
        "UpdateDateColumn",
        "DeleteDateColumn",
        "VersionColumn",
        "ManyToOne",
        "OneToMany",
        "OneToOne",
        "ManyToMany",
        "JoinColumn",
        "JoinTable",
      ].includes(decorator.getName()),
    );

    if (!isTypeOrmProperty) {
      continue;
    }

    // Don't touch properties that already have ! or ?
    if (
      property.hasExclamationToken() ||
      property.hasQuestionToken()
    ) {
      continue;
    }

    // Don't add ! to initialized properties
    if (property.hasInitializer()) {
      continue;
    }

    property.setHasExclamationToken(true);
    changed = true;
  }

  if (changed) {
    sourceFile.save().then(() => {
      console.log(`Updated: ${sourceFile.getFilePath()}`);
    }).catch((error) => {
      console.error(`Error saving file ${sourceFile.getFilePath()}:`, error);
    });
  }
}
