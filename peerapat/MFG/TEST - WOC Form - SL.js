/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
/*******************************************************************************
 * CLIENTNAME:PP
 * Work Order
 * **************************************************************************
 * Date : 16-02-2022
 *
 * Author: SP
 * Script Description : Print Work Order
 *
 *
 * REVISION HISTORY
 *
 * Revision 1.0 ${21-02-2022} SP : created
 ******************************************************************************/
define(["N/file", "N/render", "N/record", "N/search", "N/format", "N/config"], function (file, render, record, search, format, config) {

  var TEMPLATE = "./TEST - WOC Form print.xml";
  function onRequest(context) {
    //try {
    var renderer = render.create();
    renderer.templateContent = file.load(TEMPLATE).getContents();

    var recordObj = record.load({ type: "workordercompletion", id: context.request.parameters.recId });

    var userName = getCreatedPerson(context.request.parameters.recId);

    var userDate = getCreatedDate(context.request.parameters.recId);

    //oneworld
    var userPreference = config.load({
      type: config.Type.USER_PREFERENCES
   });

   var createFromObj = record.load({ type: "workorder", id: recordObj.getValue('createdfrom') });
   var assemblyObj = record.load({ type: "lotnumberedassemblyitem", id: recordObj.getValue('item') });
   var qcObj = record.load({ type: "customrecord_pp_qc_entries", id: recordObj.getValue('custbody_pp_wo_qcstatus') });


   var data = {
    userName : userName,
    printDate : formatDate(new Date()),
    qcStatus : qcObj.getValue('custrecord_pp_qc_status'),
    createFromActualProductionStartDate : createFromObj.getValue('actualproductionstartdate'),
    createFromOrder : createFromObj.getValue('tranid'),
    assembly : assemblyObj.getValue('upccode') + " " + assemblyObj.getValue('displayname'),
    pallet : assemblyObj.getValue('custitem_pallet_size'),
    lot : recordObj.getValue('custbody_wo_mfg_lot'),
    packSize : "",
    qcId : qcObj.getValue('name'),
    qcEmployeeName : "",
    cause : "",
   };

    renderer.addRecord({ templateName: "record", record: recordObj });

    var DATAObj = {
      data: data,
      // userName: userName,
      // userDate: userDate,
    };

    renderer.addCustomDataSource({
      format: render.DataSource.OBJECT,
      alias: "data",
      data: DATAObj,
    });

    log.debug("DATAObj", DATAObj);
    context.response.writeFile(renderer.renderAsPdf(), true);

    //  }catch(err){
    //    log.debug("error@onRequest",err)
    //}
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
