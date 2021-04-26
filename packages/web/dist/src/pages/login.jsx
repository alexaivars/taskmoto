"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var router_1 = __importDefault(require("next/router"));
var client_1 = require("@apollo/client");
var graphql_1 = require("generated/graphql");
client_1.gql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n  mutation login($username: String!, $password: String!) {\n    login(username: $username, password: $password) {\n      ... on AuthPayload {\n        user {\n          id\n          username\n        }\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n"], ["\n  mutation login($username: String!, $password: String!) {\n    login(username: $username, password: $password) {\n      ... on AuthPayload {\n        user {\n          id\n          username\n        }\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n"])));
client_1.gql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n  mutation signup($username: String!, $password: String!) {\n    signup(username: $username, password: $password) {\n      ... on AuthPayload {\n        user {\n          id\n          username\n        }\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n"], ["\n  mutation signup($username: String!, $password: String!) {\n    signup(username: $username, password: $password) {\n      ... on AuthPayload {\n        user {\n          id\n          username\n        }\n      }\n      ... on Error {\n        message\n      }\n    }\n  }\n"])));
var Login = function () {
    var _a = graphql_1.useLoginMutation(), login = _a[0], loginData = _a[1].data;
    var _b = graphql_1.useSignupMutation(), signup = _b[0], signupData = _b[1].data;
    var payload = (loginData === null || loginData === void 0 ? void 0 : loginData.login) || (signupData === null || signupData === void 0 ? void 0 : signupData.signup);
    if ((payload === null || payload === void 0 ? void 0 : payload.__typename) === "AuthPayload") {
        router_1.default.push("/");
    }
    return (<form onSubmit={function (e) {
            e.preventDefault();
            var _a = Object.fromEntries(new FormData(e.currentTarget)), password = _a.password, username = _a.username, entries = __rest(_a, ["password", "username"]);
            if (password && username) {
                if ("signup" in entries) {
                    signup({ variables: { password: password, username: username } });
                }
                if ("login" in entries) {
                    login({ variables: { password: password, username: username } });
                }
            }
        }}>
      <label>
        Username
        <input type="text" name="username"/>
      </label>
      <label>
        Password
        <input type="password" name="password"/>
      </label>
      <button type="submit" name="signup">
        signup
      </button>
      <button type="submit" name="login">
        login
      </button>
    </form>);
};
exports.default = Login;
var templateObject_1, templateObject_2;
