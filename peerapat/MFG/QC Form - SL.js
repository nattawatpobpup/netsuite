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
define(["N/file", "N/render", "N/record", "N/search", "N/format", "N/config",'../Lib/moment.js'], 
function (file, render, record, search, format, config,moment) {
  var TEMPLATE = "./QC PP.xml";
  function onRequest(context) {
    //try {
    var renderer = render.create();
    renderer.templateContent = file.load(TEMPLATE).getContents();

    var recordObj = record.load({ type: "customrecord_pp_qc_entries", id: context.request.parameters.recId });

    var userName = getCreatedPerson(context.request.parameters.recId);

    var userDate = getCreatedDate(context.request.parameters.recId);

    var woId = recordObj.getValue("custrecord_pp_trx_workorder");
    var woRecord = record.load({id:woId, type:"workorder"});
    var billofmatno = woRecord.getText("billofmaterials");
    var wono = woRecord.getText("tranid");

    var itemId = recordObj.getValue("custrecord_qc_item");
    var itemRecord = record.load({id:itemId, type:"lotnumberedassemblyitem"});
    var itemname = itemRecord.getValue("displayname");

    var procomId = recordObj.getValue("custrecord_pp_prdcomp");

    var ProcomRecord = record.load({id:procomId, type:"customrecord_pp_prodcomplete"});

       var tankno = ProcomRecord.getValue("custrecord_pdc_pk_tank_list");
       var ibcno = ProcomRecord.getValue("custrecord_pdc_ibctank_number");
       var checkcleanyes = ProcomRecord.getValue("custrecord_pdc_clean_yes");
       var checkcleanno = ProcomRecord.getValue("custrecord_pdc_clean_no");
       var checkvalveyes = ProcomRecord.getValue("custrecord_pdc_have_valve_cover");
       var checkvalveno = ProcomRecord.getValue("custrecord_pdc_no_valve_cover");
       var startdate = ProcomRecord.getValue("custrecord_pdc_startdate");
       var startdate1 = moment(startdate).format("D/M/YYYY");
       var starttime = ProcomRecord.getValue("custrecord_pdc_starttime");
       var starttime1 = moment(starttime).format('HH:mm a')
       var endtime = ProcomRecord.getValue("custrecord_pdc_stoptime");
       var endtime1 = moment(endtime).format('HH:mm a')
       var remark1 = ProcomRecord.getValue("custrecord35");
       var machine = ProcomRecord.getText("custrecord_pdc_machine");
       var emloyeename = ProcomRecord.getText("custrecord_pdc_employee");
       emloyeename = emloyeename.substring(emloyeename.indexOf(' ') + 1)
       var dmkg = ProcomRecord.getValue("custrecord_pdc_dm_kg");
       var codelotno = ProcomRecord.getValue("custrecord_pdc_code_lot");
       var qtylotno = ProcomRecord.getValue("custrecord_pdc_matqty_kg");
       var sumdmsm = dmkg+qtylotno;
       var stdqty = ProcomRecord.getValue("custrecord_pdc_liquid_stdqty");
       var actqty = ProcomRecord.getValue("custrecord_pdc_liquid_actqty");
       var percyields = ProcomRecord.getValue("custrecord_pdc_liquid_percyields");

       var wopcId = ProcomRecord.getValue("custrecord_pdc_workorder");
       var wopcRecord = record.load({id:wopcId, type:"workorder"});
       var wopcno = wopcRecord.getText("tranid");


    //oneworld
    var userPreference = config.load({
      type: config.Type.USER_PREFERENCES
   });
  
   var companyInfo = {};
   var compId;
   var subsidiary = userPreference.getFields();
   var compRec;
  
      compRec = config.load({
         type: config.Type.COMPANY_INFORMATION
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

    /*var DATA = [];
    var customrecord_pp_qc_entriesSearchObj = search.create({
      type: "customrecord_pp_qc_entries",
      filters:
      [
        ["internalid", "anyof", context.request.parameters.recId],
      ],
      columns:
      [
         search.createColumn({name: "altname", label: "itemname"}),
         search.createColumn({name: "custrecord_pp_qc_desc", label: "itemdes"}),
         search.createColumn({name: "custrecord_qci_start", label: "Starttime"}),
         search.createColumn({name: "custrecord_qci_end", label: "Endtime"}),
         search.createColumn({name: "custrecord_qci_ph", label: "ph"}),
         search.createColumn({name: "custrecord_qci_brix", label: "%Brix"}),
         search.createColumn({name: "custrecord_qci_density", label: "ความหนึด (ที่ 30 C)"}),
         search.createColumn({name: "custrecord_pp_qc_status", label: "QC Status"})
      ]
   });
    customrecord_pp_qc_entriesSearchObj.run().each(function (result) {
      var itemname = result.getValue(customrecord_pp_qc_entriesSearchObj.columns[0]);
      var itemdes = result.getValue(customrecord_pp_qc_entriesSearchObj.columns[1]);
      var starttime = result.getValue(customrecord_pp_qc_entriesSearchObj.columns[2]);
      var endtime = result.getValue(customrecord_pp_qc_entriesSearchObj.columns[3]);
      var phvalue = result.getValue(customrecord_pp_qc_entriesSearchObj.columns[4]);
      var brix = result.getValue(customrecord_pp_qc_entriesSearchObj.columns[5]);
      var density = result.getValue(customrecord_pp_qc_entriesSearchObj.columns[6]);
      var qcstatus = result.getText(customrecord_pp_qc_entriesSearchObj.columns[7]);

      var data = {
        itemname: itemname,
        itemdes: itemdes,
        starttime: starttime,
        endtime: endtime,
        phvalue: phvalue,
        brix: brix,
        density: density,
        qcstatus: qcstatus,
      };

      DATA.push(data);

      return true;
    });*/


    var DATAObj = {
      //item: DATA,
      userName: userName,
      userDate: userDate,
      tankno : tankno,
      ibcno:ibcno,
      checkcleanyes:checkcleanyes,
      checkcleanno:checkcleanno,
      checkvalveyes:checkvalveyes,
      checkvalveno:checkvalveno,
      startdate1:startdate1,
      starttime1:starttime1,
      endtime1:endtime1,
      remark1:remark1,
      machine : machine,
      emloyeename : emloyeename,
      dmkg : dmkg,
      codelotno : codelotno,
      qtylotno:qtylotno,
      sumdmsm : sumdmsm,
      stdqty : stdqty,
      actqty : actqty,
      percyields : percyields,
      billofmatno:billofmatno,
      itemname:itemname,
      wono:wono,
      wopcno:wopcno
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
