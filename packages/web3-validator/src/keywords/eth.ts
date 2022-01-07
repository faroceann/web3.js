import { AnySchemaObject, FuncKeywordDefinition, SchemaCxt } from 'ajv';
import { Web3ValidatorError } from '../errors';
import { DataValidateFunction, Filter, ValidInputTypes, Web3ValidationErrorObject } from '../types';
import { parseBaseType } from '../utils';
import {
	isAddress,
	isBlockNumber,
	isBlockNumberOrTag,
	isBloom,
	isBoolean,
	isBytes,
	isFilterObject,
	isHexStrict,
	isInt,
	isNumber,
	isString,
	isUInt,
} from '../validation';

const createErrorObject = (
	message: string,
	value: unknown,
): Partial<Web3ValidationErrorObject> => ({
	message,
	keyword: 'eth',
	params: { value },
});

export const metaSchema = {
	title: 'Web3 Ethereum Compatible Types',
	type: 'string',
};

const extraTypes = ['hex', 'number', 'blockNumber', 'blockNumberOrTag', 'filter', 'bloom'];

const compile = (
	type: string,
	parentSchema: AnySchemaObject,
	it: SchemaCxt,
): DataValidateFunction => {
	const typePropertyPresent = Object.keys(parentSchema).includes('type');

	if (typePropertyPresent) {
		throw new Web3ValidatorError([
			{
				keyword: 'eth',
				message: 'Either "eth" or "type" can be presented in schema',
				params: { eth: type },
				instancePath: '',
				schemaPath: it.schemaPath.str ?? '',
			},
		]);
	}

	const { baseType } = parseBaseType(type);

	if (!baseType && !extraTypes.includes(type)) {
		throw new Web3ValidatorError([
			{
				keyword: 'eth',
				message: `Eth data type "${type}" is not valid`,
				params: { eth: type },
				instancePath: '',
				schemaPath: it.schemaPath.str ?? '',
			},
		]);
	}

	const validate: DataValidateFunction = (data: ValidInputTypes): boolean => {
		let result = false;

		if (baseType) {
			// eslint-disable-next-line default-case
			switch (baseType) {
				case 'bool':
					result = isBoolean(data);
					break;
				case 'bytes':
					result = isBytes(data, { abiType: type });
					break;
				case 'string':
					result = isString(data);
					break;
				case 'uint':
					result = isUInt(data, { abiType: type });
					break;
				case 'int':
					result = isInt(data, { abiType: type });
					break;
				case 'address':
					result = isAddress(data);
					break;
				case 'tuple': {
					throw new Error('"tuple" type is not implemented directly.');
				}
			}
		} else {
			switch (type) {
				case 'hex':
					result = isHexStrict(data);
					break;
				case 'number':
					result = isNumber(data);
					break;
				case 'blockNumber':
					result = isBlockNumber(data as string);
					break;
				case 'blockNumberOrTag':
					result = isBlockNumberOrTag(data as string);
					break;
				case 'filter':
					result = isFilterObject(data as unknown as Filter);
					break;
				case 'bloom':
					result = isBloom(data);
					break;
				default:
					validate.errors = [createErrorObject(`can not identity "${type}"`, data)];
					return false;
			}
		}

		if (!result) {
			validate.errors = [createErrorObject(`must pass "${type}" validation`, data)];
		}

		return result;
	};

	return validate;
};

export const ethKeyword: FuncKeywordDefinition = {
	keyword: 'eth',
	compile,
	errors: true,
	modifying: false,
	metaSchema,
};
