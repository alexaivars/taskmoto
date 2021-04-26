"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var transform = function (fileInfo, api) {
    console.log('aa');
    return api
        .jscodeshift(fileInfo.source)
        .find(api.jscodeshift.TSEnumDeclaration)
        .forEach(function (path) {
        var enumDeclaration = path.value;
        enumDeclaration.members = enumDeclaration.members.sort(function (a, b) { var _a, _b; return ((_a = a.id) === null || _a === void 0 ? void 0 : _a.name) < ((_b = b.id) === null || _b === void 0 ? void 0 : _b.name) ? -1 : 1; });
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
