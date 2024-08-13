/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
/*******************************************************************************
 * CLIENTNAME:PP
 * Tax Invoice
 * **************************************************************************
 * Date : 24-09-2022
 *
 * Author: SP
 * Script Description : Print Invoice
 *
 *
 * REVISION HISTORY
 *
 * Revision 1.0 ${03-09-2022} SP : created
 ******************************************************************************/
define(['N/file', 'N/render', 'N/record', 'N/search', 'N/config', 'N/runtime', 'N/xml'], function (file, render, record, search, config, runtime, mxml) {
  //var TEMPLATE = "./INV ACPG.xml";
  var TEMPLATE;
  function onRequest(context) {
    try {
      var renderer = render.create();
      //renderer.templateContent  = file.load(TEMPLATE).getContents();

      var recordObj = record.load({ type: 'invoice', id: context.request.parameters.recId });
      var endCustomer = getEndCustomer(context.request.parameters.recId);
      //log.debug('endCustomer',endCustomer);

      var companyInfo = config.load({
        type: config.Type.COMPANY_INFORMATION,
      });

      var logoFile = companyInfo.getValue('formlogo');
      var fileObj = file.load({
        id: logoFile,
      });

      var signFile = companyInfo.getValue('custrecord_subsidiary_signature');
      if (!isEmpty(signFile)) {
        var signObj = file.load({
          id: signFile,
        });
        signObj = escape_for_xml(signObj.url);
      } else {
        var signObj = '';
      }
      
      var compName = companyInfo.getValue('legalname');
      var vatno = companyInfo.getValue('employerid');

      var addrRec = companyInfo.getSubrecord('mainaddress');
      var comAddress1 = addrRec.getValue('addr1');
      var comAddress2 = addrRec.getValue('addr2');
      var comAddress3 = addrRec.getValue('addr3');
      var comCity = addrRec.getValue('city');
      var comState = addrRec.getValue('state');
      var comzip = addrRec.getValue('zip');
      var tel = addrRec.getValue('addrphone');
      var fax = companyInfo.getValue('fax');

      var comAddress1 = comAddress1 + ' ' + comAddress2 + ' ' + comAddress3;
      var comAddress2 = comCity + ' ' + comState + ' ' + comzip;

      var comAddress = comAddress1 + ' ' + comAddress2;

      companyInfo = {
        companyname: compName,
        companyaddress: wordWrap(comAddress, 60),
        tel: tel,
        fax: fax,
        vatno: vatno,
      };

      log.debug('companyInfo', companyInfo);

      // var customerId = recordObj.getValue('entity');
      // var addressId = recordObj.getValue('billaddresslist');
      // var customerAddress;
      // if (!isEmpty(addressId)) customerAddress = getCustomerAddressById(customerId, addressId);
      // else {
      //   customerAddress = getCustomerBillAddress(customerId);
      // }

      // // log.debug('customerAddress', customerAddress);

      // if (!isEmpty(customerId)) customerAddress = getCustomerBillAddress(customerId);
      // if (!isEmpty(customerAddress)) {
      //   var billName = customerAddress.getValue('addressee');
      //   var billAddress1 = customerAddress.getValue('addr1');
      //   var billAddress2 = customerAddress.getValue('addr2');
      //   var billAddress3 = customerAddress.getValue('addr3');
      //   var billCity = customerAddress.getValue('city');
      //   var billState = customerAddress.getValue('state');
      //   var billZip = customerAddress.getValue('zip');
      //   var billPhone = customerAddress.getValue('custrecord_ar_customer_tel');
      // }

      // billAddress1 = billAddress1 + ' ' + billAddress2;
      // billAddress2 = billAddress3 + ' ' + billCity + ' ' + billState + ' ' + billZip;

      // var billAddress = escape_for_xml(billAddress1 + ' ' + billAddress2);
      // billAddress = wordWrap(billAddress, 70);

      // ----------- bill address new --------
      var customerAddress = recordObj.getSubrecord({
        fieldId: 'billingaddress'
      });
      if (!isEmpty(customerAddress)) {
        var billName = customerAddress.getValue("addressee");
        var billAddress1 = customerAddress.getValue("addr1");
        var billAddress2 = customerAddress.getValue("addr2");
        var billAddress3 = customerAddress.getValue("addr3");
        var billCity = customerAddress.getValue("city");
        var billState = customerAddress.getValue("state");
        var billPhone = customerAddress.getValue("custrecord_ar_customer_tel");
        var billFax = customerAddress.getValue("fax");
      }

      billAddress1 = billAddress1 + " " + billAddress2;
      billAddress2 = billCity + " " + billState;

      var billAddress = escape_for_xml(billAddress1 + " " + billAddress2);
      billAddress = wordWrap(billAddress, 70);

      log.debug('billAddress', billAddress);

      var transactionSearchObj = search.create({
        type: 'invoice',
        filters: [
          ['type', 'anyof', 'CustInvc'],
          'AND',
          ['internalid', 'anyof', context.request.parameters.recId],
          'AND',
          ['mainline', 'is', 'F'],
          'AND',
          ['taxline', 'is', 'F'],
          'AND',
          ['cogs', 'is', 'F'],
          'AND',
          ['transactiondiscount', 'is', 'F'],
        ],
        columns: [
          search.createColumn({
            name: 'formulatext',
            formula: '{memo}',
            label: 'ItemDescription',
          }),
          search.createColumn({
            name: 'formulanumeric',
        //    formula: 'abs({quantityuom})',
              formula: 'abs({quantity})',
            label: 'quantity',
          }),
          search.createColumn({
            name: 'formulatext',
            formula: '{unitabbreviation}',
            label: 'Unit',
          }),
          search.createColumn({
            name: 'formulanumeric',
            formula: 'abs({rate})',
            label: 'rate',
          }),
          search.createColumn({
            name: 'formulacurrency',
            formula: 'abs({taxamount})',
            label: 'TaxAmount',
          }),
          search.createColumn({
            name: 'rate',
            join: 'taxItem',
            label: 'taxrate',
          }),
          search.createColumn({
            name: 'type',
            join: 'item',
            label: 'Type',
          }),
          search.createColumn({
            name: 'formulatext',
            formula: '{item.itemid}',
            label: 'itemid',
          }),
          search.createColumn({
            name: 'formulacurrency',
            formula: 'abs({amount}+{taxamount})',
            label: 'Amount',
          }),
        ],
      });

      var itemArr = [];
      var searchColumns = transactionSearchObj.columns;

      transactionSearchObj.run().each(function (result) {
        var itemLine = {};

        for (var i = 0; i < searchColumns.length; i++) itemLine[searchColumns[i].label] = result.getValue(searchColumns[i]);

        //  log.debug("Discount", discountitem);
        var itemDescription = escape_for_xml(itemLine.ItemDescription);
        var linecount = itemDescription.split(/\r\n|\r|\n/g).length;
        itemDescription = itemDescription.replace(/\r\n|\r|\n/g, '<br/>');

        itemDescription = wordWrap(itemDescription, 35);

        if(itemLine.Unit.indexOf('ERROR') > -1){
          itemLine.Unit = ''
        }
        itemArr.push({
          ItemName: itemDescription,
          ItemCode: itemLine.itemid,
          Quantity: itemLine.quantity,
          Rate: itemLine.rate,
          Unit: itemLine.Unit,
          TaxRate: itemLine.taxrate,
          TaxAmount: itemLine.TaxAmount,
          Amount: itemLine.Amount,
          LineCount: linecount,
        });

        return true;
      });

      var transactionSearchObj = search.create({
        type: 'invoice',
        filters: [['internalid', 'anyof', context.request.parameters.recId], 'AND', ['mainline', 'is', 'T']],
        columns: [
          search.createColumn({
            name: 'customform',
            label: 'custform',
          }),
        ],
      });

      var custf = '';
      transactionSearchObj.run().each(function (result) {
        custf = result.getText(transactionSearchObj.columns[0]);

        return true;
      });

      var header = '';
      var headerEng = '';
      if (custf == 'ALPHA X - Service Invoice') {
        // TEMPLATE = "./REC PP.xml";
        // header = 'ใบเสร็จรับเงิน';
        headerEng = 'Invoice';
      } else if (custf == 'ALPHA X - Product Invoice') {
        // TEMPLATE = "./RECTAX PP.xml";
        // header = 'ใบเสร็จรับเงิน / ใบกำกับภาษี';
        headerEng = 'Tax Invoice';
      }

      // if (custf.indexOf('Non Entity') > -1) {
      //   TEMPLATE = './inv.xml';
      // } else {
        TEMPLATE = './TaxInvoice.xml';
      // }

      if (isEmpty(endCustomer)) {
        endCustomer = billName;
      }

      var transactionSearchObj = search.create({
        type: 'transaction',
        filters: [['internalid', 'anyof', context.request.parameters.recId], 'AND', ['mainline', 'is', 'T']],
        columns: [
          search.createColumn({
            name: 'formulatext',
            formula: '{createdby}',
            label: 'Created By',
          }),
        ],
      });

      var createName = '';
      transactionSearchObj.run().each(function (result) {
        createName = result.getValue(transactionSearchObj.columns[0]);
        return true;
      });

      var subtotal = recordObj.getValue('subtotal');
      var discounttotal = recordObj.getValue('discounttotal');
      var taxtotal = recordObj.getValue('taxtotal');
      var total = recordObj.getValue('total');
      
      var total = total
      var arrNumber = total.toString().split('.');
      var numberWords = numberToEnglish(arrNumber);
      if (arrNumber.length > 1) {
        if (parseInt(arrNumber[1]) > 0) {
          numberWords = numberWords + ' and ' + parseInt(arrNumber[1]).toString() + '/100';
        }
      }
      var totaleng = numberWords;
      var totalthai = BAHTTEXT(total);

      renderer.addRecord({ templateName: 'record', record: recordObj });

      var appName = getApprovedPerson(context.request.parameters.recId);

      var data = {
        header: header,
        headerEng: headerEng,
        signUrl: signObj,
        custf:custf,
        logoUrl: escape_for_xml(fileObj.url),
        createName: removeDuplicates(createName),
        billName: escape_for_xml(billName),
        appName:appName,
        // billVatId: billVatId,
        billPhone: billPhone,
        billAddress: billAddress,
        copytext: 'ต้นฉบับ',
        copytexteng: 'Original',
        itemArr: itemArr,
        subtotal: subtotal,
        discounttotal: discounttotal,
        taxtotal: taxtotal,
        total: total,
        totaleng: totaleng,
        totalthai: totalthai,
      };

      log.debug('data', data);

      log.debug('TEMPLATE', TEMPLATE);
      renderer.templateContent = file.load(TEMPLATE).getContents();

      renderer.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: 'data',
        data: data,
      });

      renderer.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: 'company',
        data: companyInfo,
      });

      arrFileId = [];
      var foldderId = getScriptFolder(runtime.getCurrentScript().id);
      var filePdf = renderer.renderAsPdf();
      filePdf.name = context.request.parameters.recId + '.pdf';
      filePdf.folder = foldderId;
      filePdf.isOnline = true;
      var fileId = filePdf.save();
      arrFileId.push(fileId);

      data.copytext = 'สำเนา';
      data.copytexteng = 'Copy';
      renderer.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: 'data',
        data: data,
      });

      var filePdf2 = renderer.renderAsPdf();
      filePdf2.name = context.request.parameters.recId + '_2.pdf';
      filePdf2.folder = foldderId;
      filePdf2.isOnline = true;
      var fileId2 = filePdf2.save();
      arrFileId.push(fileId2);

      //
      //Adjust to support batch print
      if (!isEmpty(context.request.parameters.batchid) && !isEmpty(context.request.parameters.folderid)) {
        //Batch Print
        var filePdf = generateXml(arrFileId);
        filePdf.name = context.request.parameters.batchid + '_' + context.request.parameters.recId + '.pdf';
        filePdf.folder = context.request.parameters.folderid;
        filePdf.isOnline = true;
        var fileBatchId = filePdf.save();
        log.debug('fileBatchId', fileBatchId);
        context.response.write('fileid:' + fileBatchId);
      } else {
        //Normal Print
        context.response.writeFile(generateXml(arrFileId), true);
      }
      ////

      file.delete({
        id: fileId,
      });
      file.delete({
        id: fileId2,
      });

      //context.response.writeFile(renderer.renderAsPdf(),true);
      /*
             if (context.request.parameters.preprint == 'Y') {
                 context.response.write(renderer.renderAsString());
             } else {
                 context.response.write(renderer.renderAsString());
                 //context.response.writeFile(renderer.renderAsPdf(),true);
             }
             */
    } catch (err) {
      log.debug('error@onRequest', err);
    }
  }

  function removeDuplicates(str) {
    const arr = str.split(' ');
    const arr2 = [];

    arr.forEach(function (el) {
      if (arr2.indexOf(el) === -1) {
        arr2.push(el);
      }
    });

    return arr2.join(' ');
  }

  function getApprovedPerson(recordId) {
    var transactionSearchObj = search.create({
      type: 'transaction',
      filters: [['internalid', 'anyof', recordId], 'AND', ['mainline', 'is', 'T'], 'AND', ['systemnotes.type', 'is', 'T']],
      columns: [
        search.createColumn({
          name: 'name',
          join: 'systemNotes',
          label: 'Set by',
        }),
      ],
    });

    var setby = '';
    transactionSearchObj.run().each(function (result) {
      // .run().each has a limit of 4,000 results
      setby = result.getValue(transactionSearchObj.columns[0]);
      return true;
    });

    var employeeSearchObj = search.create({
      type: "employee",
      filters:
      [
        ["internalid","anyof",setby]
     ],
      columns:
      [
         search.createColumn({name: "supervisor", label: "Supervisor"})
      ]
   });
   var supervisor = ''
   employeeSearchObj.run().each(function(result){
      // .run().each has a limit of 4,000 results
      supervisor = result.getText(employeeSearchObj.columns[0]);
      return true;
   });

  //  log.debug("setby + supervisor", setby + ' ' + supervisor)
   return supervisor;
  }

  function getScriptFolder(scriptId) {
    var scriptSearchObj = search.create({
      type: 'script',
      filters: [['scriptid', 'is', scriptId]],
      columns: [search.createColumn({ name: 'scriptfile', label: 'Script File' })],
    });
    var fileId;
    scriptSearchObj.run().each(function (result) {
      fileId = result.getValue(scriptSearchObj.columns[0]);
      return true;
    });

    var folderId;
    if (!isEmpty(fileId)) {
      var fileObj = file.load({
        id: fileId,
      });
      if (!isEmptyObj(fileObj)) {
        folderId = fileObj.folder;
      }
    }

    return folderId;
  }

  function getRecordType(recordId) {
    var recTypeLookup = search.lookupFields({
      type: search.Type.TRANSACTION,
      id: recordId,
      columns: 'recordtype',
    });
    return recTypeLookup.recordtype;
  }

  function generateXml(arrFileId) {
    var tpl = ['<?xml version="1.0"?>', '<pdfset>'];

    arrFileId.map(function (id) {
      const partFile = file.load({ id: id });
      var pdf_fileURL = mxml.escape({ xmlText: partFile.url });
      //log.debug('pdf_fileURL',pdf_fileURL);
      tpl.push("<pdf src='" + pdf_fileURL + "'/>");
    });

    tpl.push('</pdfset>');

    //log.debug({title:'bound template', details:mxml.escape({xmlText:tpl.join('\n')})});

    return render.xmlToPdf({
      xmlString: tpl.join('\n'),
    });
  }

  function isEmpty(str) {
    return !str || 0 === str.length;
  }

  function isEmptyObj(obj) {
    return Object.keys(obj).length === 0;
  }

  function getEndCustomer(id) {
    var salesorderSearchObj = search.create({
      type: 'invoice',
      filters: [['type', 'anyof', 'CustInvc'], 'AND', ['internalid', 'anyof', id], 'AND', ['mainline', 'is', 'F'], 'AND', ['taxline', 'is', 'F']],
      columns: [
        search.createColumn({
          name: 'formulatext',
          summary: 'GROUP',
          formula: "NVL({custcol_mcla_so_endcustomer},NVL({custbody_mcla_customer_endcustomer},'NONE'))",
          label: 'EndUser',
        }),
        search.createColumn({
          name: 'formulatext',
          summary: 'MAX',
          formula: 'NVL({custcol_mcla_so_endcustomer.custrecord_mcla_endcustomer_address},{custbody_mcla_customer_endcustomer.custrecord_mcla_endcustomer_address})',
          label: 'Address',
        }),
      ],
    });

    var endCustomer = '';
    var count = 0;
    salesorderSearchObj.run().each(function (result) {
      var endUser = result.getValue(salesorderSearchObj.columns[0]);
      var address = result.getValue(salesorderSearchObj.columns[1]);

      if (!isEmpty(endUser) && endUser != 'NONE') {
        count++;
        if (count > 1) endCustomer += '<br/>';
        endCustomer += count.toString() + '. ' + escape_for_xml(endUser);
      }
      return true;
    });

    return endCustomer;
  }

  function numberToEnglish(n, custom_join_character) {
    var string = n.toString(),
      units,
      tens,
      scales,
      start,
      end,
      chunks,
      chunksLen,
      chunk,
      ints,
      i,
      word,
      words;

    var and = custom_join_character || 'and';

    /* Is number zero? */
    if (parseInt(string) === 0) {
      return 'zero';
    }

    /* Array of units as words */
    units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

    /* Array of tens as words */
    tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    /* Array of scales as words */
    scales = [
      '',
      'thousand',
      'million',
      'billion',
      'trillion',
      'quadrillion',
      'quintillion',
      'sextillion',
      'septillion',
      'octillion',
      'nonillion',
      'decillion',
      'undecillion',
      'duodecillion',
      'tredecillion',
      'quatttuor-decillion',
      'quindecillion',
      'sexdecillion',
      'septen-decillion',
      'octodecillion',
      'novemdecillion',
      'vigintillion',
      'centillion',
    ];

    /* Split user arguemnt into 3 digit chunks from right to left */
    start = string.length;
    chunks = [];
    while (start > 0) {
      end = start;
      chunks.push(string.slice((start = Math.max(0, start - 3)), end));
    }

    /* Check if function has enough scale words to be able to stringify the user argument */
    chunksLen = chunks.length;
    if (chunksLen > scales.length) {
      return '';
    }

    /* Stringify each integer in each chunk */
    words = [];
    for (i = 0; i < chunksLen; i++) {
      chunk = parseInt(chunks[i]);

      if (chunk) {
        /* Split chunk into array of individual integers */
        ints = chunks[i].split('').reverse().map(parseFloat);

        /* If tens integer is 1, i.e. 10, then add 10 to units integer */
        if (ints[1] === 1) {
          ints[0] += 10;
        }

        /* Add scale word if chunk is not zero and array item exists */
        if ((word = scales[i])) {
          words.push(word);
        }

        /* Add unit word if array item exists */
        if ((word = units[ints[0]])) {
          words.push(word);
        }

        /* Add tens word if array item exists */
        if ((word = tens[ints[1]])) {
          words.push(word);
        }

        /* Add 'and' string after units or tens integer if: */
        if (ints[0] || ints[1]) {
          /* Chunk has a hundreds integer or chunk is the first of multiple chunks */
          if (ints[2] || (!i && chunksLen)) {
            words.push(and);
          }
        }

        /* Add hundreds word if array item exists */
        if ((word = units[ints[2]])) {
          words.push(word + ' hundred');
        }
      }
    }

    return words.reverse().join(' ');
  }

  function getCustomerAddressById(customerId, addressId) {
    var customerRec = record.load({ type: 'customer', id: customerId });
    var add_Count = customerRec.getLineCount('addressbook');
    var billaddress;
    for (var i = 0; i < add_Count; i++) {
      var addId = customerRec.getSublistValue('addressbook', 'id', i);
      var anAddress = customerRec.getSublistSubrecord('addressbook', 'addressbookaddress', i);
      if (addressId == addId) {
        billaddress = anAddress;
      }
    }
    return billaddress;
  }

  function getCustomerBillAddress(customerId) {
    var customerRec = record.load({ type: 'customer', id: customerId });
    var add_Count = customerRec.getLineCount('addressbook');
    var billaddress;
    for (var i = 0; i < add_Count; i++) {
      var def_Bill = customerRec.getSublistValue('addressbook', 'defaultbilling', i);
      var def_Ship = customerRec.getSublistValue('addressbook', 'defaultshipping', i);
      var anAddress = customerRec.getSublistSubrecord('addressbook', 'addressbookaddress', i);
      if (def_Bill) {
        billaddress = anAddress;
      }
    }
    return billaddress;
  }

  function getCustomerShipAddress(customerId) {
    var customerRec = record.load({ type: 'customer', id: customerId });
    var add_Count = customerRec.getLineCount('addressbook');
    var shipaddress;
    for (var i = 0; i < add_Count; i++) {
      var def_Bill = customerRec.getSublistValue('addressbook', 'defaultbilling', i);
      var def_Ship = customerRec.getSublistValue('addressbook', 'defaultshipping', i);
      var anAddress = customerRec.getSublistSubrecord('addressbook', 'addressbookaddress', i);
      if (def_Ship) {
        shipaddress = anAddress;
      }
    }
    return shipaddress;
  }

  function formatCurrency(val, decimal) {
    var parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed.toFixed(decimal).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }

  var xml_special_to_escaped_one_map = {
    '&': '&amp;',
    '"': '&quot;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&apos;',
    Ø: '&Oslash;',
  };

  var escaped_one_to_xml_special_map = {
    '&amp;': '&',
    '&quot;': '"',
    '&lt;': '<',
    '&gt;': '>',
    '&apos;': "'",
    '&Oslash;': 'Ø',
  };

  function encodeXml(string) {
    return string.replace(/([\&"<>'Ø])/g, function (str, item) {
      return xml_special_to_escaped_one_map[item];
    });
  }

  function decodeXml(string) {
    return string.replace(/(&quot;|&lt;|&gt;|&amp;|&apos;|&Oslash;)/g, function (str, item) {
      return escaped_one_to_xml_special_map[item];
    });
  }

  function escape_for_xml(argument) {
    try {
      if (argument != '' && argument != null) {
        argument = decodeXml(argument);
        argument = encodeXml(argument);
        return argument;
      } else {
        return '';
      }
    } catch (e) {
      log.debug({
        title: e.name,
        details: e.message,
      });
    }
  }

  function parseNumber(val) {
    var parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }

  function parseFloat2Decimals(val) {
    Number.prototype.round = function (p) {
      p = p || 10;
      return parseFloat(this.toFixed(p));
    };

    var parsed = parseFloat(val);
    parsed = parsed.round(2);
    return isNaN(parsed) ? 0 : parsed;
  }

  function wordWrap(str, maxWidth) {
    var newLineStr = '<br/>';
    done = false;
    res = '';
    while (str.length > maxWidth) {
      found = false;
      for (i = maxWidth - 1; i >= 0; i--) {
        if (testWhite(str.charAt(i))) {
          res = res + [str.slice(0, i), newLineStr].join('');
          str = str.slice(i + 1);
          found = true;
          break;
        }
      }

      if (!found) {
        res += [str.slice(0, maxWidth), newLineStr].join('');
        str = str.slice(maxWidth);
      }
    }

    return res + str;
  }

  function testWhite(x) {
    var white = new RegExp(/^\s$/);
    return white.test(x.charAt(0));
  }

  function getFullCountryName(countryCode) {
    var country = [];
    var customrecord_mcla_countrySearchObj = search.create({
      type: 'customrecord_mcla_country',
      filters: [["formulanumeric: case when LOWER({custrecord_mcla_countrycode_alpha2}) = '" + countryCode + "' then 1 else 0 end", 'equalto', '1']],
      columns: [
        search.createColumn({ name: 'custrecord_mcla_countrycode_fullname', label: 'Full Name' }),
        search.createColumn({ name: 'custrecord_mcla_countrycode_region', label: 'Region' }),
        search.createColumn({ name: 'custrecord_mcla_countrycode_subregion', label: 'Sub-Region' }),
      ],
    });
    customrecord_mcla_countrySearchObj.run().each(function (result) {
      var countryName = result.getValue(customrecord_mcla_countrySearchObj.columns[0]);
      var regionName = result.getValue(customrecord_mcla_countrySearchObj.columns[1]);
      var subRegionName = result.getValue(customrecord_mcla_countrySearchObj.columns[2]);
      country.push({
        Country: countryName,
        Region: regionName,
        SubRegion: subRegionName,
      });
      return true;
    });

    return country;
  }

  /**
   * @name BAHTTEXT.js
   * @version 1.1.5
   * @update May 1, 2017
   * @website: https://github.com/earthchie/BAHTTEXT.js
   * @author Earthchie http://www.earthchie.com/
   * @license WTFPL v.2 - http://www.wtfpl.net/
   **/
  function BAHTTEXT(num, suffix) {
    'use strict';

    if (typeof suffix === 'undefined') {
      suffix = 'บาทถ้วน';
    }

    num = num || 0;
    num = num.toString().replace(/[, ]/g, ''); // remove commas, spaces

    if (isNaN(num) || Math.round(parseFloat(num) * 100) / 100 === 0) {
      return 'ศูนย์บาทถ้วน';
    } else {
      var t = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'],
        n = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'],
        len,
        digit,
        text = '',
        parts,
        i;

      if (num.indexOf('.') > -1) {
        // have decimal

        /*
         * precision-hack
         * more accurate than parseFloat the whole number
         */

        parts = num.toString().split('.');

        num = parts[0];
        parts[1] = parseFloat('0.' + parts[1]);
        parts[1] = (Math.round(parts[1] * 100) / 100).toString(); // more accurate than toFixed(2)
        parts = parts[1].split('.');

        if (parts.length > 1 && parts[1].length === 1) {
          parts[1] = parts[1].toString() + '0';
        }

        num = parseInt(num, 10) + parseInt(parts[0], 10);

        /*
         * end - precision-hack
         */
        text = num ? BAHTTEXT(num) : '';

        if (parseInt(parts[1], 10) > 0) {
          text = text.replace('ถ้วน', '') + BAHTTEXT(parts[1], 'สตางค์');
        }

        return text;
      } else {
        if (num.length > 7) {
          // more than (or equal to) 10 millions

          var overflow = num.substring(0, num.length - 6);
          var remains = num.slice(-6);
          return BAHTTEXT(overflow).replace('บาทถ้วน', 'ล้าน') + BAHTTEXT(remains).replace('ศูนย์', '');
        } else {
          len = num.length;
          for (i = 0; i < len; i = i + 1) {
            digit = parseInt(num.charAt(i), 10);
            if (digit > 0) {
              if (len > 2 && i === len - 1 && digit === 1 && suffix !== 'สตางค์') {
                text += 'เอ็ด' + t[len - 1 - i];
              } else {
                text += n[digit] + t[len - 1 - i];
              }
            }
          }

          // grammar correction
          text = text.replace('หนึ่งสิบ', 'สิบ');
          text = text.replace('สองสิบ', 'ยี่สิบ');
          text = text.replace('สิบหนึ่ง', 'สิบเอ็ด');

          return text + suffix;
        }
      }
    }
  }

  return {
    onRequest: onRequest,
  };
});
