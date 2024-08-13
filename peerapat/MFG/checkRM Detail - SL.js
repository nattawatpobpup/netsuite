/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
/*******************************************************************************
 * CLIENTNAME:PP
 * Work Order
 * **************************************************************************
 * Date : 16-02-2023
 *
 * Author: SP
 * Script Description : Print Work Order
 *
 *
 * REVISION HISTORY
 *
 * Revision 1.0 ${21-02-2022} SP : created
 ******************************************************************************/
define(["N/file", "N/render", "N/record", "N/search", "N/format", "N/config",'./moment.js'], function (file, render, record, search, format, config,moment) {
  var TEMPLATE = "./checkRM.xml";
  function onRequest(context) {
    try {
    var renderer = render.create();
    renderer.templateContent = file.load(TEMPLATE).getContents();

    var recordObj = record.load({ type: "workorder", id: context.request.parameters.recId });

    var userName = getCreatedPerson(context.request.parameters.recId);
    log.debug('userName',userName);

    var userDate = getCreatedDate(context.request.parameters.recId);

    var fromlo = recordObj.getText("location");

    if (fromlo.indexOf(":") > -1) {
      pos = fromlo.indexOf(":");
      fromlo = fromlo.substring(pos + 1);
    }

    var assemblyitem = recordObj.getText("assemblyitem");
    assemblyitem = escape_for_xml(assemblyitem);
    assemblyitem = wordWrap(assemblyitem,60,'<br/>');

    var date = recordObj.getValue('trandate');
    date = moment(date).subtract(1, 'days').format('DD/M/YYYY')
    log.debug('date',date);

    //var yesterday = getOnedaybeforeDate(date);
    //log.debug('yesterday',yesterday);


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

    var location = recordObj.getValue("location");

    var locRec = record.load({
      type: "location",
      id: location,
    });

    var addrRecloc = locRec.getSubrecord("mainaddress");
    var locAddress1 = addrRecloc.getValue("addr1");
    var locAddress2 = addrRecloc.getValue("addr2");
    var locAddress3 = addrRecloc.getValue("addr3");
    var locCity = addrRecloc.getValue("city");
    var locState = addrRecloc.getValue("state");
    var loczip = addrRecloc.getValue("zip");
    var locDestination = addrRecloc.getValue("addressee");

    var locAddress1 = locAddress1 + " " + locAddress2 + " " + locAddress3;
    var locAddress2 = locCity + " " + locState + " " + loczip;

    var locAddress = locAddress1 + " " + locAddress2;

    renderer.addRecord({ templateName: "record", record: recordObj });

    var DATA = [];
    var workorderSearchObj = search.create({
      type: "workorder",
      filters:
      [
         ["type","anyof","WorkOrd"], 
         "AND", 
         ["mainline","is","F"], 
         "AND", 
         ["internalid","anyof",context.request.parameters.recId], 
         "AND", 
         ["taxline","is","F"], 
         "AND", 
         ["item.custitem_item_displaytext","contains","Component"]
      ],
      columns:
      [
         search.createColumn({
            name: "displayname",
            join: "item",
            label: "itemname"
         }),
         search.createColumn({name: "quantity", label: "qty"}),
         search.createColumn({
            name: "formulatext",
            formula: "{item}",
            label: "itemno"
         })
      ]
   });
   workorderSearchObj.run().each(function (result) {
      var itemname = result.getValue(workorderSearchObj.columns[0]);
      var qty = result.getValue(workorderSearchObj.columns[1]);
      var itemno = result.getValue(workorderSearchObj.columns[2]);

      itemname = escape_for_xml(itemname);
      itemname = wordWrap(itemname,35,'<br/>'); 

      var data = {
        itemname: itemname,
        qty: qty,
        itemno: itemno,
      };

      DATA.push(data);

      return true;
    });

    var DATAObj = {
      item: DATA,
      fromlo: fromlo,
      //tolo: tolo,
      userName: userName,
      userDate: userDate,
      locAddress: locAddress,
      locDestination: locDestination,
      logoUrl : escape_for_xml(fileObj.url),
      date : date,
      assemblyitem:assemblyitem
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

    log.debug("DATAObj", DATAObj);
    context.response.writeFile(renderer.renderAsPdf(), true);

     }catch(err){
        log.debug("error@onRequest",err)
    }
  }


 /* function getOnedaybeforeDate(date) {
    var yesterdaydate = date;
  
    yesterdaydate.setDate(date.getDate() - 1);
  
    return yesterdaydate;
  }*/

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
      filters: [["internalid", "anyof", internalId], "AND", ["mainline", "is", "T"]],
      columns: [
        search.createColumn({
          name: "formulatext",
          formula: "{createdby}",
          label: "Created By",
        }),
      ],
    });

    var createName = "";
    transactionSearchObj.run().each(function (result) {
      createName = result.getValue(transactionSearchObj.columns[0]);

      createName = createName.substring(createName.indexOf(' ') + 1)
      return true;
    });

    return createName;
  }

  function getCreatedDate(internalId) {
    var transactionSearchObj = search.create({
      type: "transaction",
      filters: [["internalid", "anyof", internalId], "AND", ["mainline", "is", "T"]],
      columns: [
        search.createColumn({
          name: "formulatext",
          formula: "TO_CHAR({trandate},'DD/MM/YY')",
          label: "Date Created",
        }),
      ],
    });

    var createDate = "";
    transactionSearchObj.run().each(function (result) {
      createDate = result.getValue(transactionSearchObj.columns[0]);
      return true;
    });

    return createDate;
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
