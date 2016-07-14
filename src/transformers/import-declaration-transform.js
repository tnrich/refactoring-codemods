import {dirname, relative} from 'path';
import {ensureDotSlash, filterMatchingPaths, removeExtension} from './fileHelpers';

const renameLiteral = (j, newName) => (path) => {
  j(path).replaceWith(() => j.literal(newName));
};

export default function importDeclarationTransform(file, api, options) {
  const {path: filePath, source} = file;
  const {jscodeshift: j} = api;
  const {paths, printOptions = {}} = options;

  const root = j(source);
  const basedir = dirname(filePath);

  const requires = root
    .find(j.VariableDeclarator, {
      id: {type: 'Identifier'},
      init: {callee: {name: 'require'}},
    })
    .find(j.Literal);

  const imports = root
    .find(j.ImportDeclaration)
    .find(j.Literal);

  const allPaths = [].concat(requires.paths(), imports.paths());

  paths.forEach(({prevFilePath, nextFilePath}) => {
    const matchesPath = filterMatchingPaths(basedir, prevFilePath);
    const relativeNextFilePath = ensureDotSlash(removeExtension(relative(basedir, nextFilePath)));

    const nodesToUpdate = j(allPaths).filter(matchesPath);

    const noop = nodesToUpdate.length <= 0;
    if (noop) return;

    nodesToUpdate.forEach(
      renameLiteral(j, relativeNextFilePath)
    );
  });

  return root.toSource(printOptions);
}
