import { Transform } from 'jscodeshift';

const transform: Transform = (fileInfo, api) => {
  return api
    .jscodeshift(fileInfo.source)
    .find(api.jscodeshift.TSEnumDeclaration)
    .forEach((path) => {
      const enumDeclaration = path.value;
      enumDeclaration.members = enumDeclaration.members.sort((a, b) =>
        // eslint-disable-next-line
        (a.id as any)?.name < (b.id as any)?.name ? -1 : 1
      );
    })
    .toSource();
};
module.exports = transform;
module.exports.parser = 'tsx';

// import { API, ASTPath, FileInfo, Transform, TSEnumDeclaration, TSEnumMember, TSTypeParameter } from 'jscodeshift';

// const transform: Transform = (fileInfo:FileInfo, api:API) =>
//   api
//     .jscodeshift(fileInfo.source)
//     .find(api.jscodeshift.TSEnumDeclaration)
//     .forEach((path) => {
//       const enumDeclaration:TSEnumDeclaration = path.value;
//       const members: TSEnumMember[] = enumDeclaration.members.sort((a, b) =>
//         (a.id as TSTypeParameter).name < (b.id as TSTypeParameter).name ? -1 : 1,
//       );
//       enumDeclaration.members = members
//     })
//     .toSource();

// module.exports = transform;
// module.exports.parser = 'tsx';
