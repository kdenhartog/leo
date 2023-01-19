const camelCase = require('lodash.camelcase')
const fileHeader = require('../web/fileHeader')

function isToken (tokenOrTokenCategory) {
  return !!tokenOrTokenCategory.type
}

function cleanKey (key) {
  return camelCase(key.trim())
}

function deThemeColorTokens(tokenCategory) {
  const result = {}
  for (const key in tokenCategory) {
    const value = tokenCategory[key]
    if (isToken(value)) {
      result[key] = {
        ...tokenCategory[key],
        name: tokenCategory[key].name?.replace('-light-', '-')
      }
      continue
    }
    result[key] = deThemeColorTokens(value)
  }
  return result
}

function formattedVariables (properties) {
  const result = {}
  for (const key in properties) {
    let value = properties[key]
    if (!isToken(value)) {
      // Is it a special color case?
      // TODO(petemill): This is ugly, there's got to be a cleaner way, or at least centralize this between
      // web, tailwind and styled-components.
      if (['color', 'legacy'].includes(key) && !!value.light) {
        value = {
          ...value,
          ...deThemeColorTokens(value['light'])
        }
      }
      result[cleanKey(key)] = formattedVariables(value)
      continue
    }
    let name = value.name
    result[cleanKey(key)] = 'var(--' + name + ')'
  }
  return result
}

module.exports = ({ dictionary, file }) => {
  const themeObject = formattedVariables(dictionary.properties)
  return fileHeader({ file }) +
    'export default ' + JSON.stringify(themeObject, null, 2)
}
