var config = require('../../config/config');
var rp = require('request-promise');
var request = require('request');
var model = require('../../db')
var helperFunc = require('../../helper/chartData');
var commonCassandraFunc = require('../../common/cassandraFunc');

//controller for entity observation report
exports.entityReport = async function (req, res) {

  let data = await entityObservationData(req, res);

  res.send(data);
}

exports.observationsByEntity = async function (req, res) {


  // console.log("req", req);
  // console.log("entityId and observationId are required fields");
  if (!req.body && !req.body) {
    res.status(400);
    var response = {
      result: false,
      message: 'entityId and observationId are required fields'
    }
    res.send(response);
  }
  else {
    model.MyModel.findOneAsync({
      qid: "observations_by_entity"
    }, {
      allow_filtering: true
    })
      .then(async function (result) {

        if (req.body.search) {

          console.log("result", result.query);


          var bodyParam = JSON.parse(result.query);
          if (config.druid.observation_datasource_name) {
            bodyParam.dataSource = config.druid.observation_datasource_name;
          }
          var query = bodyParam;
          var fieldsArray = [];
          var search = "%"+req.body.search+"%";
          var dimension = "";

          if (req.body.entityType == "zone") {
            dimension= "zone";
          } else if (req.body.entityType == "block") {
            dimension= "block";
          } else if (req.body.entityType == "hub") {
            dimension= "hub";
          } else if (req.body.entityType == "cluster") {
            dimension= "cluster";
          } else if (req.body.entityType == "distict") {
            dimension= "distict";
          } else if (req.body.entityType == "state") {
            dimension= "state";
          } else {
            dimension= "entityId";
          }

          fieldsArray.push({ "type": "selector", "dimension": dimension, "value": req.body.queryId });
          fieldsArray.push({ "type": "like", "dimension": "observationName", "pattern": search });
          query.filter.fields.push(...fieldsArray);

          console.log("fieldsArray",fieldsArray);
          
          query.filter.type = "and";
          var options = config.druid.options;
          options.method = "POST";
          options.body = query;
          var data = await rp(options);

          // console.log("data", data);


          let observationData  = await getObsvByentitys(req,result);

          // console.log("observationData",observationData);

          var arr = [];

          await Promise.all(observationData.map(async each => {
            arr.push(each);
          }));

          // console.log("data",data);

          await Promise.all(data.map(async each => {


            console.log("each",each);
            if(!arr.includes(each)){
              arr.push(each);
            }
          }));

        

          res.send(arr);


        } else {

          let observationData  = await getObsvByentitys(req,result);
          res.send(observationData);


          // console.log("result", result.query);

          // var bodyParam = JSON.parse(result.query);
          // if (config.druid.observation_datasource_name) {
          //   bodyParam.dataSource = config.druid.observation_datasource_name;
          // }
          // var query = bodyParam;
          // var fieldsArray = [];


          // await Promise.all(req.body.entityIds.map(async ele => {
          //   let objSelecter = { "type": "selector", "dimension": "entityId", "value": ele };
          //   fieldsArray.push(objSelecter);
          // }
          // ));
          // console.log("fields",fieldsArray);

          // query.filter.fields.push(...fieldsArray);
          // // console.log("query",query);
          // var options = config.druid.options;
          // options.method = "POST";
          // options.body = query;
          // var data = await rp(options);

          // console.log("data", data);
          // res.send(data);

        }
      });
  }

}

async function entityObservationPdf(req, res) {

  return new Promise(async function (resolve, reject) {


    if (!req.body.entityId && !req.body.observationId) {
      // res.status(400);
      var response = {
        result: false,
        message: 'entityId and observationId are required fields'
      }
      reject(response);
    }
    else {
      model.MyModel.findOneAsync({ qid: "entity_observation_query" }, { allow_filtering: true })
        .then(async function (result) {
          var bodyParam = JSON.parse(result.query);

          if (config.druid.observation_datasource_name) {
            bodyParam.dataSource = config.druid.observation_datasource_name;
          }

          bodyParam.filter.fields[0].value = req.body.entityId;
          bodyParam.filter.fields[1].value = req.body.observationId;

          //pass the query as body param and get the resul from druid
          var options = config.druid.options;
          options.method = "POST";
          options.body = bodyParam;
          var data = await rp(options);

          if (!data.length) {
            reject({ "data": "No observations made for the entity" })
          }
          else {
            var responseObj = await helperFunc.entityReportChart(data)
            resolve(responseObj);
          }
        })
        .catch(function (err) {
          // res.status(400);
          var response = {
            result: false,
            message: 'Data not found'
          }
          reject(response);
        })
      // } else {
      //   res.send(JSON.parse(dataReportIndexes['apiresponse']))
      // }
    }

  });


}


async function entityObservationData(req, res) {

  try {
    return new Promise(async function (resolve, reject) {

      try {
        if (!req.body.entityId && !req.body.observationId) {
          // res.status(400);
          var response = {
            result: false,
            message: 'entityId and observationId are required fields'
          }
          resolve(response);
        }
        else {
          //cassandra functionality to check response in cassandra
          // bodyData = req.body
          // var dataReportIndexes = await commonCassandraFunc.checkReqInCassandra(bodyData)
          // if (dataReportIndexes == undefined) {
          model.MyModel.findOneAsync({ qid: "entity_observation_query" }, { allow_filtering: true })
            .then(async function (result) {
              var bodyParam = JSON.parse(result.query);
              if (config.druid.observation_datasource_name) {
                bodyParam.dataSource = config.druid.observation_datasource_name;
              }
              bodyParam.filter.fields[0].value = req.body.entityId;
              bodyParam.filter.fields[1].value = req.body.observationId;
              //pass the query as body param and get the resul from druid
              var options = config.druid.options;
              options.method = "POST";
              options.body = bodyParam;
              var data = await rp(options);
              if (!data.length) {
                resolve({ "data": "No observations made for the entity" })
              }
              else {
                var responseObj = await helperFunc.entityReportChart(data)
                resolve(responseObj);
                // commonCassandraFunc.insertReqAndResInCassandra(bodyData, responseObj)
              }
            })
            .catch(function (err) {
              res.status(400);
              var response = {
                result: false,
                message: 'Data not found'
              }
              resolve(response);
            })
          // } else {
          //   res.send(JSON.parse(dataReportIndexes['apiresponse']))
          // }
        }
      } catch (err) {
        console.log("error in entity report data", err);
      }

    });
  } catch (err) {
    console.log("error in entity report data", err);
  }


}


exports.entityObservationDataExport = async function entityObservationDataExport(req, res) {

  return new Promise(async function (resolve, reject) {

    let responseData = await entityObservationData(req, res);

    resolve(responseData);

  })

};

async function getObsvByentitys(req,result){
  return new Promise(async function(resolve,reject){
    
    var bodyParam = JSON.parse(result.query);
    if (config.druid.observation_datasource_name) {
      bodyParam.dataSource = config.druid.observation_datasource_name;
    }
    var query = bodyParam;
    var fieldsArray = [];


    await Promise.all(req.body.entityIds.map(async ele => {
      let objSelecter = { "type": "selector", "dimension": "entityId", "value": ele };
      fieldsArray.push(objSelecter);
    }
    ));
    console.log("fields",fieldsArray);

    query.filter.fields.push(...fieldsArray);
    // console.log("query",query);
    var options = config.druid.options;
    options.method = "POST";
    options.body = query;
    var data = await rp(options);

    console.log("data", data);
    resolve(data);
  });

}

//Controller for entity observation report
exports.entityObservationReport = async function(req,res){
  if (!req.body.entityId && !req.body.entityType && !req.body.observationId){
    res.status(400);
    var response = {
      result: false,
      message: 'entityId, entityType, immediateChildEntityType and observationId are required fields'
    }
    res.send(response);
  }
  else {
    entityType = req.body.entityType;
    entityId = req.body.entityId;
    immediateChildEntityType = req.body.immediateChildEntityType;

    // Fetch query from cassandra
    model.MyModel.findOneAsync({ qid: "entity_observation_report_query" }, { allow_filtering: true })
    .then(async function (result) {

      var bodyParam = JSON.parse(result.query);

      if (config.druid.observation_datasource_name) {
        bodyParam.dataSource = config.druid.observation_datasource_name;
      }

       //Assign values to the query filter object 
       bodyParam.filter.fields[0].dimension = req.body.entityType;
       bodyParam.filter.fields[0].value = req.body.entityId;
       bodyParam.filter.fields[1].value = req.body.observationId;

       //Push column names dynamically to the query dimensions array 
       if(!req.body.immediateChildEntityType){
         bodyParam.dimensions.push(entityType, entityType + "Name");
       }
       else {
         bodyParam.dimensions.push(entityType, entityType + "Name", immediateChildEntityType, immediateChildEntityType + "Name");
       }

      if (entityType == "cluster") {
        data = await getHardcodedClusterdata();
      } else if (entityType == "block") {
        data = await getHardcodedBlockData();
      } else {

       //pass the query as body param and get the result from druid
       var options = config.druid.options;
       options.method = "POST";
       options.body = bodyParam;
       var data = await rp(options);
      }
       if (!data.length) {
         res.send({"data": "No observations made for the entity"})
       }
       else {
          var responseObj = await helperFunc.entityObservationReportChartObjectCreation(data)
          responseObj.observationId = req.body.observationId;
          res.send(responseObj);
        // commonCassandraFunc.insertReqAndResInCassandra(bodyData, responseObj)
      }
    })
    .catch(function (err) {
      res.status(400);
      var response = {
        result: false,
        message: 'Data not found'
      }
      res.send(response);
    })
     
  }

}


function getHardcodedClusterdata(){
  var data = [
    {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/3",
          "questionId": "5d5ce95f3292c409b85916e5",
          "questionAnswer": "SMT NISHU JAIN",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": null,
          "questionName": "Discussions with the School Head",
          "questionResponseType": "text"
      }
   },

     {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/3",
          "questionId": "5d5ce95f3292c409b85916e5",
          "questionAnswer": "REETU JAMES",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": null,
          "questionName": "Discussions with the School Head",
          "questionResponseType": "text"
      }
   },

    {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/1",
          "questionId": "5d5ce95f3292c409b85916e5",
          "questionAnswer": "R1",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": "Yes",
          "questionName": "A visitor register is maintained with entries of vendors, parents, contractual staff and others",
          "questionResponseType": "radio"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/1",
          "questionId": "5d5ce95f3292c409b85916e5",
          "questionAnswer": "R1",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5db91d4ff23c3718ec8a0ea4",
          "questionResponseLabel": "Yes",
          "questionName": "A visitor register is maintained with entries of vendors, parents, contractual staff and others",
          "questionResponseType": "radio"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/2",
          "questionId": "5d5ce95f3292c409b8591708",
          "questionAnswer": "R1",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": "Yes",
          "questionName": "All abandoned areas are secured and locked",
          "questionResponseType": "radio"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/2",
          "questionId": "5d5ce95f3292c409b8591708",
          "questionAnswer": "R1",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5db91d4ff23c3718ec8a0ea4",
          "questionResponseLabel": "Yes",
          "questionName": "All abandoned areas are secured and locked",
          "questionResponseType": "radio"
      }
  },

{
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R1",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": "Hospital",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R1",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5db91d4ff23c3718ec8a0ea4",
          "questionResponseLabel": "Hospital",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R2",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": "Doctor",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R2",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5db91d4ff23c3718ec8a0ea4",
          "questionResponseLabel": "Doctor",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R3",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": "Police",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R3",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5db91d4ff23c3718ec8a0ea4",
          "questionResponseLabel": "Police",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R4",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": "Fire Station",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R4",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5db91d4ff23c3718ec8a0ea4",
          "questionResponseLabel": "Fire Station",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R5",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": "Childline",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R5",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5db91d4ff23c3718ec8a0ea4",
          "questionResponseLabel": "Childline",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  }

]
return data;
}





function getHardcodedBlockData(){
 
  var data = [
    {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "block":"876543b25678e86512456781",
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/3",
          "questionId": "5d5ce95f3292c409b85916e5",
          "questionAnswer": "SMT NISHU JAIN",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": null,
          "questionName": "Discussions with the School Head",
          "questionResponseType": "text"
      }
   },

     {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "block":"876543b25678e86512456781",
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/3",
          "questionId": "5d5ce95f3292c409b85916e5",
          "questionAnswer": "REETU JAMES",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": null,
          "questionName": "Discussions with the School Head",
          "questionResponseType": "text"
      }
   },

    {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "block":"876543b25678e86512456781",
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/1",
          "questionId": "5d5ce95f3292c409b85916e5",
          "questionAnswer": "R1",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": "Yes",
          "questionName": "A visitor register is maintained with entries of vendors, parents, contractual staff and others",
          "questionResponseType": "radio"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "block":"876543b25678e86512456781",
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/1",
          "questionId": "5d5ce95f3292c409b85916e5",
          "questionAnswer": "R1",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5db91d4ff23c3718ec8a0ea4",
          "questionResponseLabel": "Yes",
          "questionName": "A visitor register is maintained with entries of vendors, parents, contractual staff and others",
          "questionResponseType": "radio"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "block":"876543b25678e86512456781", 
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/2",
          "questionId": "5d5ce95f3292c409b8591708",
          "questionAnswer": "R1",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": "Yes",
          "questionName": "All abandoned areas are secured and locked",
          "questionResponseType": "radio"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "block":"876543b25678e86512456781",
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/2",
          "questionId": "5d5ce95f3292c409b8591708",
          "questionAnswer": "R1",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5db91d4ff23c3718ec8a0ea4",
          "questionResponseLabel": "Yes",
          "questionName": "All abandoned areas are secured and locked",
          "questionResponseType": "radio"
      }
  },

{
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "block":"876543b25678e86512456781",
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R1",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": "Hospital",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "block":"876543b25678e86512456781", 
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R1",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5db91d4ff23c3718ec8a0ea4",
          "questionResponseLabel": "Hospital",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "block":"876543b25678e86512456781",
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R2",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": "Doctor",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "block":"876543b25678e86512456781",
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R2",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5db91d4ff23c3718ec8a0ea4",
          "questionResponseLabel": "Doctor",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "block":"876543b25678e86512456781", 
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R3",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": "Police",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "block":"876543b25678e86512456781",
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R3",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5db91d4ff23c3718ec8a0ea4",
          "questionResponseLabel": "Police",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": { 
          "block":"876543b25678e86512456781",
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R4",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": "Fire Station",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "block":"876543b25678e86512456781",
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R4",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5db91d4ff23c3718ec8a0ea4",
          "questionResponseLabel": "Fire Station",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "block":"876543b25678e86512456781",
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"56781354b56789254617825f",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R5",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5d79e322e3be8677c3fedcd2",
          "questionResponseLabel": "Childline",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  },
  {
      "version": "v1",
      "timestamp": "1901-01-01T00:00:00.000Z",
      "event": {
          "block":"876543b25678e86512456781", 
          "cluster":"6e6dfff56fe164452ffc5679",
          "school":"87781554b56789254617889d",
          "observationId": "5d5cfff56fe163341eeb9787",
          "questionExternalId": "DSCEE/4",
          "questionId": "5d5ce95f3292c409b85916f9",
          "questionAnswer": "R5",
          "observationName": "School safety checklist",
          "observationSubmissionId": "5db91d4ff23c3718ec8a0ea4",
          "questionResponseLabel": "Childline",
          "questionName": "Important phone numbers are displayed",
          "questionResponseType": "multiselect"
      }
  }

]


return data;

}