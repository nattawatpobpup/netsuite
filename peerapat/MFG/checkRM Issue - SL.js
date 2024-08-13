/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
/*******************************************************************************
 * CLIENTNAME:PP
 * workorderissue
 * **************************************************************************
 * Date : 16-02-2022
 *
 * Author: SP
 * Script Description : Print workorderissue
 *
 *
 * REVISION HISTORY
 *
 * Revision 1.0 ${21-02-2022} SP : created
 ******************************************************************************/
 define(["N/file", "N/render", "N/record", "N/search", "N/format", "N/config",'./moment.js'], function (file, render, record, search, format, config, moment) {
  var TEMPLATE = "./checkRM Issue.xml";
  function onRequest(context) {
    try {
    var renderer = render.create();
    renderer.templateContent = file.load(TEMPLATE).getContents();

    var recordObj = record.load({ type: "workorderissue", id: context.request.parameters.recId });

    var workid = recordObj.getValue("createdfrom");

    var woRecord = record.load({type:"workorder",id:workid});
    var workno = woRecord.getValue("quantity");

    log.debug('workno',workno);

    var requesteddate = woRecord.getValue("custbody_sending_date");
    requesteddate = moment(requesteddate).format('DD/M/YYYY')
    var requestedtime = woRecord.getValue("requesteddate");
    requestedtime = moment(requestedtime).format('hh:mm')

    log.debug('requestedtime',requestedtime);

    var trandate = woRecord.getValue("startdate");
    trandate = moment(trandate).format('DD/M/YYYY')

    var unitwo = woRecord.getText("units");


    var assemblyitem = recordObj.getText("item");
    assemblyitem = escape_for_xml(assemblyitem);
    assemblyitem = wordWrap(assemblyitem,65,'<br/>');

     var date = woRecord.getValue('custbody_preparing_date');
     date = moment(date).format('DD/M/YYYY')
    //date = moment(date).subtract(1, 'days').format('DD/M/YYYY')
    log.debug('date',date);

    var userName = getCreatedPerson(context.request.parameters.recId);
    
    //oneworld
    var userPreference = config.load({
      type: config.Type.USER_PREFERENCES
   });

   var companyInfo = {};
   var compId;
   var subsidiary = userPreference.getFields();
   if(subsidiary.indexOf('SUBSIDIARY') > -1) {
      log.debug('OneWorld','OneWorld');
      compId = recordObj.getValue('subsidiary');
   } else {
      log.debug('NotOneWorld','NotOneWorld');
      compId = 1;
   }

   var compRec = record.load({
         type : "subsidiary",
         id : compId
   });

   var logosub = compRec.getValue("logo");

       var fileObj = file.load({
           id: logosub
       });  
    var addrRec = compRec.getSubrecord("mainaddress");
    var comAddress1 = addrRec.getValue("addr1");
    var comAddress2 = addrRec.getValue("addr2");
    var comAddress3 = addrRec.getValue("addr3");
    var comCity = addrRec.getValue("city");
    var comState = addrRec.getValue("state");
    var comzip = addrRec.getValue("zip");
    var comfax = compRec.getValue("fax");

    var comAddress1 = comAddress1 + " " + comAddress2 + " " + comAddress3;
    var comAddress2 = comCity + " " + comState + " " + comzip;

    var comAddress = comAddress1 + " " + comAddress2;

    var comlongAdd = comAddress1 + ' ' + comAddress2;

    var compName = compRec.getValue("name");
    var taxID = compRec.getValue("federalidnumber");
    var compNameeng = compRec.getValue('custrecord_pp_add_nameeng');
    var phoneno = compRec.getValue('custrecord_pp_add_tel');
    var faxno = compRec.getValue('fax');
    var addeng = compRec.getValue('custrecord_pp_add_addresseng');
    var website = compRec.getValue('url');
    var email = compRec.getValue('email');

    companyInfo = {
      companyname: compName,
      companyaddress: comAddress,
      companytaxid: taxID,
      compNameeng : compNameeng,
      phoneno : phoneno,
      faxno : faxno,
      addeng : addeng,
      website : website,
      email : email,
      comlongAdd : comlongAdd
    };

    log.debug("companyInfo", companyInfo);

    renderer.addRecord({ templateName: "record", record: recordObj });

    var DATA = [];
      var workorderissueSearchObj = search.create({
        type: "workorderissue",
        filters:
        [
           ["type","anyof","WOIssue"], 
           "AND", 
           ["mainline","is","F"], 
           "AND", 
           ["internalid","anyof",context.request.parameters.recId], 
           "AND", 
           ["account","noneof","1209","417"],
           //"AND", 
           //["taxline","is","F"], 
           "AND", 
           ["transactionlinetype","noneof","WIP"]
        ],
        columns:
        [
           search.createColumn({name: "type", label: "type"}),
           search.createColumn({
              name: "tranid",
              join: "createdFrom",
              label: "WO"
           }),
           search.createColumn({name: "item", label: "itemno"}),
           search.createColumn({
              name: "displayname",
              join: "item",
              label: "itemname"
           }),
           search.createColumn({
            name: "formulanumeric",
            formula: "(-1)*{quantity}", 
            label: "qty"
          }),
           search.createColumn({name: "unit", label: "unit"}),
           search.createColumn({name: "rate", label: "rate"}),
           search.createColumn({name: "amount", label: "amount"}),
           search.createColumn({name: "serialnumbers", label: "lotno"}),
           search.createColumn({
            name: "formulatext",
            formula: "{item}",
            label: "itemnum",
          }),
          search.createColumn({
            name: "internalid",
            join: "createdFrom",
            label: "WOint"
         }),
        ]
     });

     var typeform;
     var createdform;
     var itemno;
     var itemname;
     var qty;
     var unit;
     var rate;
     var amount;
     var lotno;
     var itemnum;
     var data = {};
      workorderissueSearchObj.run().each(function (result) {
         typeform = result.getValue(workorderissueSearchObj.columns[0]);
         createdform = result.getValue(workorderissueSearchObj.columns[1]);
         itemno = result.getValue(workorderissueSearchObj.columns[2]);
         itemname = result.getValue(workorderissueSearchObj.columns[3]);
         qty = result.getValue(workorderissueSearchObj.columns[4]);
         unit = result.getValue(workorderissueSearchObj.columns[5]);
         rate = result.getValue(workorderissueSearchObj.columns[6]);
         amount = result.getValue(workorderissueSearchObj.columns[7]);
         lotno = result.getValue(workorderissueSearchObj.columns[8]);
         itemnum = result.getValue(workorderissueSearchObj.columns[9]);

        lotno = lotno.split('\n').join(',\n');
      log.debug("lotno", lotno);

      itemname = escape_for_xml(itemname);
      itemname = wordWrap(itemname,35,'<br/>'); 

      data = {
          typeform: typeform,
          createdform: createdform,
          itemno: itemno,
          itemname: itemname,
          qty: qty,
          unit: unit,
          rate: rate,
          amount: amount,
          lotno: lotno,
          itemnum : itemnum
        };

        DATA.push(data);

        return true;
      });     



    var DATAObj = {
      item: DATA,
      logoUrl : escape_for_xml(fileObj.url),
      userName : userName,
      workno :workno,
      assemblyitem:assemblyitem,
      date : date,
      requesteddate:requesteddate,
      requestedtime:requestedtime,
      trandate:trandate,
      unitwo:unitwo
    };

    renderer.addCustomDataSource({
      format: render.DataSource.OBJECT,
      alias: "data",
      data: DATAObj,
    });

    renderer.addCustomDataSource({
      format: render.DataSource.OBJECT,
      alias: "company",
      data: companyInfo,
    });

    log.debug("data", DATAObj);
    context.response.writeFile(renderer.renderAsPdf(), true);


    }catch(err){
     log.debug("error@onRequest",err)
    }
    
  }

  function removeDuplicates(originalArray, prop) {
    var newArray = [];
    var lookupObject = {};

    for (var i in originalArray) {
      lookupObject[originalArray[i][prop]] = originalArray[i];
    }

    for (i in lookupObject) {
      newArray.push(lookupObject[i]);
    }
    return newArray;
  }

  function getCreatedPerson(internalId) {
    var transactionSearchObj = search.create({
        type: "transaction",
        filters:
        [
           ["internalid","anyof",internalId], 
           "AND", 
           ["mainline","is","T"]
        ],
        columns:
        [
            search.createColumn({
                name: "formulatext",
                formula: "{createdby}",
                label: "Created By"
             })
        ]
     });       
     
     var createName = '';
     transactionSearchObj.run().each(function(result) {
        createName = result.getValue(transactionSearchObj.columns[0]);

        createName = createName.substring(createName.indexOf(' ') + 1)

        log.debug("createName", createName);

        return true;
    });         

    return createName;
     

 }


  function formatDate(paramDate) {
    var responseDate;
    if (!isEmpty(paramDate)) {
      responseDate = format.format({
        value: paramDate,
        type: format.Type.DATE,
      });
    }
    return responseDate;
  }

  function formatCurrency(val, decimal) {
    var parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed.toFixed(decimal).replace(/\d(?=(\d{3})+\.)/g, "$&,");
  }

  function escape_for_xml(argument) {
    try {
      if (argument != "" && argument != null) {
        argument = argument.replace(/&/g, "&amp;");
        argument = argument.replace(/</g, "&lt;");
        argument = argument.replace(/>/g, "&gt;");
        argument = argument.replace(/"/g, "&quot;");
        argument = argument.replace(/'/g, "&apos;");
        argument = argument.replace(/Ø/g, "&Oslash;");
        return argument;
      } else {
        return "";
      }
    } catch (e) {
      log.debug({
        title: e.name,
        details: e.message,
      });
    }
  }

  function isEmpty(str) {
    return !str || 0 === str.length;
  }

  function parseNumber(val) {
    var parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }

  function wordWrap(str, maxWidth) {
    var newLineStr = "<br/>";
    done = false;
    res = "";
    while (str.length > maxWidth) {
      found = false;
      for (i = maxWidth - 1; i >= 0; i--) {
        if (testWhite(str.charAt(i))) {
          res = res + [str.slice(0, i), newLineStr].join("");
          str = str.slice(i + 1);
          found = true;
          break;
        }
      }

      if (!found) {
        res += [str.slice(0, maxWidth), newLineStr].join("");
        str = str.slice(maxWidth);
      }
    }

    return res + str;
  }

  function testWhite(x) {
    var white = new RegExp(/^\s$/);
    return white.test(x.charAt(0));
  }

  return {
    onRequest: onRequest,
  };
});
