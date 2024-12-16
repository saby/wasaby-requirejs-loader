/**
 * Library that provides the conduct of the modules system
 * @library
 * @public
 * @module
 * @kaizenZone da98e741-0b59-480a-82b2-a83669ab3167
 */

export { default as getResourceUrl } from './_conduct/getResourceUrl';
export { default as getModuleUrl } from './_conduct/getModuleUrl';
export { default as IModulesHandler, ModuleLoadCallback } from './_conduct/IModulesHandler';
export { default as IModulesManager } from './_conduct/IModulesManager';
export { default as IModulesManagerSync } from './_conduct/IModulesManagerSync';
export { default as ModulesManager } from './_conduct/ModulesManager';
export { default as loadFont, isCompatibleMode as isCompatibleFontMode } from './_conduct/loadFont';
