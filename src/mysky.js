
import { SkynetClient, Permission, PermCategory, PermType, CustomGetJSONOptions } from "skynet-js";
import { UserProfileDAC } from "@skynethub/userprofile-library";
const userProfile = new UserProfileDAC();
const portal = window.location.hostname === 'localhost' ? "https://siasky.net" : undefined;
const client = new SkynetClient(portal);

export class MySky {
    constructor(name, sessionStart){
        this.name = name
        this.start = sessionStart
        this.seed = ""
        this._init()
        this.skynetClient = { registry: { getEntry: {}, getFileContent: {}}}
        this.skynetClient["registry"]["getEntry"] = async function(path, callback){
            this.getJSON(path, callback)
        }

        this.skynetClient["registry"]["getFileContent"] = function(skylink){
            // convert the file to a dataURL, save it as encrypted json
            return new Promise((resolve, reject) => {
                _mysky.getJSONEncrypted("blobs.json").then((json) => {
                    let url = json.blobs[skylink.replace("sia:", "")]
                    fetch(url).then(res => res.blob()).then((blob) => resolve(blob))
                })
            })
        }
        /**
         * Weirdly there doesn't seem to be a uploadFileEncrypted method. 
         * Instead I'll save the file as encrypted json I guess lol
         */
        this.skynetClient.uploadFile = function(blob) {
            // convert the file to a dataURL, save it as encrypted json
            return new Promise((resolve, reject) => {
                debugger
                _mysky.getJSONEncrypted(_reqDomain + "/blobs.json").then((json) => {
                    let reader = new FileReader()
                    reader.onload = function(url){
                        json.data = json.data["data"] ? json.data.data : json.data
                        json.data = json.data ? json.data : []
                        json.data[json.data.length] = (reader.result["data"])
                        console.log(json.data)
                        _mysky.setJSONEncrypted(_reqDomain + "/blobs.json", json).then((result) => {
                            debugger
                            resolve({skylink: "sia:" + json.data.length})
                        })
                    } 
                    reader.readAsDataURL(blob);
                })
            })
        }
    }
    /**
     * Get the user's seed, set up the profile DAC, call whatever function was passed into the constructor as the start function. 
     * We will add some variables to the window that will be used later on 
     */
    async _init(){
        let reqDomain = await client.extractDomain(window.location.hostname)
        window._reqDomain = reqDomain
        let mysky = await client.loadMySky(reqDomain)
        await mysky.loadDac(userProfile);
        window._mysky = mysky
        let loggedIn = await mysky.checkLogin()
        window._loggedIn = loggedIn
        if(loggedIn){
            let userID = await mysky.userID()
            window._userID = userID 
            this.seed = userID + "_" + await mysky.getEncryptedPathSeed(_reqDomain + "/", true)
            this.start("login_success")
        }
    }
    /**
     * Try and start as if the user is logged in, if they aren't open the MySky window
     */
    async sessionStart(){
        await this._init()
        if(!_loggedIn) _mysky.requestLoginAccess()
    }
    /**
     * Logout
     */
    async sessionDestroy(){     
        await _mysky.logout();
    }
    // Set json as encrypted, call the callback
    async setJSON(path, json, callback){
        debugger
        path = path.replace(":", "-")
        await _mysky.setJSONEncrypted(_reqDomain + "/" + path + ".json", {[path]: json})
        callback()
    }
    // Retrieve encrypted data and return it to the callback in the correct structure
    async getJSON(path, callback){
        path = path.replace(":", "-")
        let result = await _mysky.getJSONEncrypted(_reqDomain + "/" + path + ".json")
        callback({entry: result["data"] ? {data: result.data[path], datalink: result["datalink"]} : null})
    }
    // Should set the user's MySky profile, but not sure if this is really necessary
    async setRegistry(path, json, callback) { 
        let prof = await userProfile.getProfile(_userID)
        path = path.replace("hackerpaste:", "")
        prof[path] = json
        await userProfile.setProfile(prof)
        callback({entry: prof[path] ? {data: prof[path]} : null})
    }
    // Retrieve the user's MySky profile
    async getRegistry(path, callback){
        const prof = await userProfile.getProfile(_userID)
        path = path.replace("hackerpaste:", "")
        callback({entry: prof[path] ? {data: prof[path]} : null})
    }
    hideOverlay(){}
}

/**
 * Intentionally does nothing because we're using mysky encryption now
 * @param {*} data the data
 * @param {*} docKey unused
 * @returns the data
 */

export const encryptData = (data, docKey) => {
    return data
}
/**
 * Retrieves the data and decrypts it. Assumes the docKey is the mysky.seed
 * @param {*} data unused
 * @param {MySky.seed} docKey a combination of mysky userID and mysky.getEncryptedPathSeed seperated by "_"
 */
export const decryptData = (data, docKey) => {
    let userID = docKey.substring(0, docKey.indexOf("skyseed:"));
    let seed = docKey.substring(docKey.indexOf("skyseed:")+1);
    client.file.getJSONEncrypted(userID, seed);
}

/**
 * Helper function to be used with encryptData. Also does nothing
 * @param {*} data 
 * @param {*} seed 
 * @returns 
 */
export const encryptObject = (data, seed) => {
    data = JSON.stringify(data);
    let encryptedData = encryptData(data, seed);
    data = {encrypted:encryptedData.toString()};
    return data;
};

/**
 * Helper function to decrypt data
 * @param {*} data unused
 * @param {MySky.seed} docKey a combination of mysky userID and mysky.getEncryptedPathSeed seperated by "_"
 */
export const decryptObject = (data, seed) => {
    decryptData(data.encrypted, seed);
}
