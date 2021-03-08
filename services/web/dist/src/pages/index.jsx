"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerSideProps = void 0;
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var config_1 = __importDefault(require("next/config"));
var styled_components_1 = __importDefault(require("styled-components"));
var client_1 = require("@apollo/client");
var apolloClient_1 = __importDefault(require("../apolloClient"));
var config = config_1.default().serverRuntimeConfig;
var graphql_1 = require("../generated/graphql");
var Title = styled_components_1.default.h1(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n  font-size: 50px;\n"], ["\n  font-size: 50px;\n"])));
var ME_QUERY = client_1.gql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n  query me {\n    me {\n      ... on User {\n        id\n        username\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n"], ["\n  query me {\n    me {\n      ... on User {\n        id\n        username\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n"])));
function getServerSideProps(ctx) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var client, accessToken, data;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    client = apolloClient_1.default({}, ctx);
                    accessToken = ctx.req.cookies["access-token"];
                    try {
                        console.log(">", jsonwebtoken_1.default.verify(accessToken, config.jwtAccessTokenPublic));
                    }
                    catch (_d) { }
                    return [4 /*yield*/, client.query({
                            query: graphql_1.MeDocument,
                        })];
                case 1:
                    data = (_c.sent()).data;
                    if (data.me.__typename !== "User") {
                        return [2 /*return*/, {
                                redirect: {
                                    destination: "/login",
                                    permanent: false,
                                },
                            }];
                    }
                    return [2 /*return*/, {
                            props: { username: ((_a = data === null || data === void 0 ? void 0 : data.me) === null || _a === void 0 ? void 0 : _a.username) || null, id: ((_b = data === null || data === void 0 ? void 0 : data.me) === null || _b === void 0 ? void 0 : _b.id) || null }, // will be passed to the page component as props
                        }];
            }
        });
    });
}
exports.getServerSideProps = getServerSideProps;
function Home(_a) {
    var _b;
    var username = _a.username;
    var data = client_1.useQuery(ME_QUERY).data;
    return <Title>{((_b = data === null || data === void 0 ? void 0 : data.me) === null || _b === void 0 ? void 0 : _b.username) || username} page</Title>;
}
exports.default = Home;
var templateObject_1, templateObject_2;
