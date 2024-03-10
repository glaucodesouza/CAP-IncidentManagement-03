const cds = require('@sap/cds')
const { jwtDecode } = require('jwt-decode');

class ProcessorService extends cds.ApplicationService {
  /** Registering custom event handlers */
  init() {
    this.before("UPDATE", "Incidents", (req) => this.onUpdate(req));
    this.before("CREATE", "Incidents", (req) => this.changeUrgencyDueToSubject(req.data));
    this.before("READ", "Incidents", (req) => this.getLoggedUser(req));

    return super.init();
  }

  changeUrgencyDueToSubject(data) {
    if (data) {
      const incidents = Array.isArray(data) ? data : [data];
      incidents.forEach((incident) => {
        if (incident.title?.toLowerCase().includes("urgent")) {
          incident.urgency = { code: "H", descr: "High" };
        }
      });
    }
  }

  /** Custom Validation */
  async onUpdate (req) {
    const { status_code } = await SELECT.one(req.subject, i => i.status_code).where({ID: req.data.ID})
    if (status_code === 'C')
      return req.reject(`Can't modify a closed incident`)
  }

  async getLoggedUser(req){
    
    let user = {
        id     : 'não logado',
        email  : 'não logado',
        roles  : ['não logado'],
        allData: false
    }

    try {
      let allData = false
      let RolesArray = []
      console.log("getLoggedUser()",req._.headers.authorization);
      let splits = req._.headers.authorization.split(" ")

      if (splits[0] === 'Bearer') {
          let dJWTT = jwtDecode(splits[1]);
          console.log("getLoggedUser", "Bear: "+splits[1])
          for(let role of dJWTT.scope){
              let rol = role.split(".")[1]
              if(rol){
                  RolesArray.push(rol)
              }
              if(!allData){
                  allData = (rol === 'Administrator' || rol === 'Manager')
              }
          }
          user = {
              id     : dJWTT.user_name,
              email  : dJWTT.email,
              roles  : RolesArray,
              allData: allData
          }

          await UPSERT.into (UserLogado, [
              { IDUSER:dJWTT.user_name, EMAIL:dJWTT.email, ALLDATA:allData }
            ])

            /*
              await UPDATE(Apontamentos, apontamentoAnterior.ID).with({
                      DataFim: req.data.DataInicio,
                      ApontamentoSubsequente_ID: req.data.ID
            */
          
          console.log("getLoggedUser", 'ID:'+user.id + ' email:' +user.email + ' roles:' + RolesArray + ' allData:'+allData)
          return user
      }else{
          console.log("getLoggedUser", 'ID:'+user.id + 'email:' +user.email + 'roles:' + RolesArray + 'allData:'+allData)
          return user
      }
    } catch (e) {
        console.log("getLoggedUser",e)
        console.log("getLoggedUser", 'ID:'+user.id + 'email:' +user.email + 'roles:' + user.roles + 'allData:'+user.allData)
        return user
    }        
  }
}
module.exports = ProcessorService
