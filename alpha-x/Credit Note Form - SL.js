/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
/*******************************************************************************
 * CLIENTNAME:PP
 * Print CN
 * **************************************************************************
 * Date : 30-09-2022
 *
 * Author: SP
 * Script Description : Print CN
 *
 *
 * REVISION HISTORY
 *
 * Revision 1.0 ${30-09-2022} SP : created
 ******************************************************************************/
define(['N/file', 'N/render', 'N/record', 'N/search', 'N/config', 'N/runtime', 'N/xml'], function (file, render, record, search, config, runtime, mxml) {
  function onRequest(context) {
    try {
      var renderer = render.create();

      var cnRecord = record.load({ type: 'creditmemo', id: context.request.parameters.recId });

      var companyInfo = config.load({
        type: config.Type.COMPANY_INFORMATION,
      });

      var logoFile = companyInfo.getValue('formlogo');
      var fileObj = file.load({
        id: logoFile,
      });

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
        companyaddress: wordWrap(comAddress, 50),
        tel: tel,
        fax: fax,
        vatno: vatno,
      };

      log.debug('companyInfo', companyInfo);

      var subtotal = cnRecord.getValue('subtotal');
      const totalamount = cnRecord.getValue('total');
      var totaltax = cnRecord.getValue('taxtotal');
      
      var totalCredit = totalCredit;
      var arrNumber = totalamount.toString().split('.');
      log.debug('totalamount', totalamount);
      // var numberWords = numberToEnglish(arrNumber);
      var numberWords = usdToText(totalamount*1);
      // if (arrNumber.length > 1) {
      //   if (parseInt(arrNumber[1]) > 0) {
      //     numberWords = numberWords + ' and ' + parseInt(arrNumber[1]).toString() + 'satang';
      //   }
      // }
      var totaleng = numberWords;
      var totalthai = BAHTTEXT(totalamount);

      var creditmemoSearchObj = search.create({
        type: 'creditmemo',
        filters: [
          ['type', 'anyof', 'CustCred'],
          'AND',
          ['internalid', 'anyof', context.request.parameters.recId],
          'AND',
          ['mainline', 'is', 'F'],
          'AND',
          ['taxline', 'is', 'F'],
          'AND',
          ['cogs', 'is', 'F'],
        ],
        columns: [
          search.createColumn({
            name: 'itemid',
            join: 'item',
            label: 'item',
          }),
          search.createColumn({
            name: 'formulatext',
            formula: '{memo}',
            label: 'description',
          }),
          search.createColumn({
            name: 'formulanumeric',
            // formula: 'abs({quantityuom})',
            formula: 'abs({quantity})',
            label: 'quantity',
          }),
          search.createColumn({
            name: 'formulacurrency',
            formula: 'abs({rate})',
            label: 'rate',
          }),
          search.createColumn({
            name: 'formulatext',
            formula: '{unitabbreviation}',
            label: 'unit',
          }),
          search.createColumn({
            name: 'formulacurrency',
            formula: 'abs({taxamount})',
            label: 'taxamount',
          }),
          search.createColumn({
            name: 'formulacurrency',
            formula: 'abs({fxamount})',
            label: 'amount',
          }),
          search.createColumn({
            name: 'formulacurrency',
            formula: 'abs({amount})',
            label: 'bahtamount',
          }),
          search.createColumn({
            name: 'grossamount',
            label: 'Amount (Gross)',
          }),
          search.createColumn({
            name: 'rate',
            join: 'taxItem',
            label: 'taxrate',
          }),
          search.createColumn({
            name: 'taxtype',
            join: 'taxItem',
            label: 'Tax Type',
          }),
        ],
      });

      var itemArr = [];
      var taxcode;
      creditmemoSearchObj.run().each(function (result) {
        var itemcode = result.getValue(creditmemoSearchObj.columns[0]);
        var description = result.getValue(creditmemoSearchObj.columns[1]);
        var quantity = result.getValue(creditmemoSearchObj.columns[2]);
        var rate = result.getValue(creditmemoSearchObj.columns[3]);
        var unit = result.getValue(creditmemoSearchObj.columns[4]);
        var taxamount = result.getValue(creditmemoSearchObj.columns[5]);
        var totalamount = result.getValue(creditmemoSearchObj.columns[6]);
        var bahtamount = result.getValue(creditmemoSearchObj.columns[7]);
        var grossamt = result.getValue(creditmemoSearchObj.columns[8]);
        var taxrate = result.getValue(creditmemoSearchObj.columns[9]);
        taxcode = result.getText(creditmemoSearchObj.columns[10]);

        if (quantity.indexOf('ERROR') > -1) {
          quantity = '';
        }
        if (unit.indexOf('ERROR') > -1) {
          unit = '';
        }
        itemArr.push({
          itemcode: itemcode,
          description: description,
          quantity: quantity,
          rate: rate,
          unit: unit,
          taxamount: taxamount,
          totalamount: totalamount,
          bahtamount: bahtamount,
          grossamt: Math.abs(grossamt) + Math.abs(taxamount),
          taxrate: taxrate,
          taxcode: taxcode,
        });

        return true;
      });
      var oriAmount = 0;
      var invoiceSearchObj = search.create({
        type: 'invoice',
        filters: [['type', 'anyof', 'CustInvc'], 'AND', ['mainline', 'is', 'T'], 'AND', ['applyingtransaction.internalid', 'anyof', context.request.parameters.recId]],
        columns: [
          search.createColumn({ name: 'tranid', label: 'invnum' }),
          search.createColumn({ name: 'trandate', label: 'invdate' }),
          search.createColumn({
            name: 'formulacurrency',
            formula: '{amount}',
            label: 'amount',
          }),
          search.createColumn({ name: 'taxtotal', label: 'Amount (Transaction Tax Total)' }),
        ],
      });
      var iteminv = [];
      invoiceSearchObj.run().each(function (result) {
        var invnum = result.getValue(invoiceSearchObj.columns[0]);
        var invdate = result.getValue(invoiceSearchObj.columns[1]);
        var amount = result.getValue(invoiceSearchObj.columns[2]);
        var taxtotal = result.getValue(invoiceSearchObj.columns[3]);

        oriAmount = amount

        iteminv.push({
          invnum: invnum,
          invdate: invdate,
          amount: amount,
          taxtotal: taxtotal,
        });
        log.debug('iteninv', iteminv);
        return true;
      });

      var customerAddress = cnRecord.getSubrecord({
        fieldId: 'billingaddress',
      });

      var custAddress = cnRecord.getValue('custbody_custonetime_custaddress');
      var taxId = cnRecord.getValue('custbodycustonetime_taxid');

      if (!isEmpty(customerAddress)) {
        var billAddress1 = customerAddress.getValue('addr1');
        var billAddress2 = customerAddress.getValue('addr2');
        var billAddress3 = customerAddress.getValue('addr3');
        var billCity = customerAddress.getValue('city');
        var billState = customerAddress.getValue('state');
        var billCountry = customerAddress.getValue('country');
        var billzip = customerAddress.getValue('zip');
        var billPhone = customerAddress.getValue('custrecord_ar_customer_tel');
        var billFax = customerAddress.getValue('fax');

        billAddress1 = billAddress1 + ' ' + billAddress2 + ' ' + billAddress3;
        billAddress2 = billCity + ' ' + billState + ' ' + billzip;

        var billaddress = escape_for_xml(billAddress1 + ' ' + billAddress2);
        billaddress = wordWrap(billaddress, 70);
      }

      if (billaddress.trim() === '') {
        billaddress = wordWrap(custAddress, 100);
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

      // var recId = cnRecord.getValue("createdfrom");
      // var recordtype = getRecordType(recId);
      // var transaction = record.load({ type: recordtype, id: recId });
      // var subtotal = transaction.getValue("subtotal");
      var grandTotal = Math.abs(subtotal) + totaltax;

      // if(taxcode.toUpperCase() == 'S_VAT'){

      // var custf = '';
      // transactionSearchObj.run().each(function (result) {
      //   custf = result.getText(transactionSearchObj.columns[0]);

      //   return true;
      // });

      var custf = cnRecord.getText('customform');
      var header = '';
      var headerEng = '';
      if (custf == 'ALPHA X - Credit Memo Service') {
        // TEMPLATE = "./REC PP.xml";
        // header = 'ใบเสร็จรับเงิน';
        headerEng = 'Credit Note';
      } else if (custf == 'ALPHA X - Credit Memo Product') {
        // TEMPLATE = "./RECTAX PP.xml";
        // header = 'ใบเสร็จรับเงิน / ใบกำกับภาษี';
        headerEng = 'Credit Note/Tax Invoice';
      }

      var TEMPLATE = './credit note.xml';
      // } else{
      //   var TEMPLATE = "./cn tax.xml";
      // }

      var appName = getApprovedPerson(context.request.parameters.recId);
      var applyAmt = cnRecord.getValue('applied')

      renderer.templateContent = file.load(TEMPLATE).getContents();
      var data = {
        custf: custf,
        header: header,
        headerEng: headerEng,
        logoUrl: escape_for_xml(fileObj.url),
        taxcode: taxcode,
        appName: appName,
        createName: createName,
        totaleng: totaleng,
        totalthai: totalthai,
        oriAmount: oriAmount,
        correctValue: Math.abs(oriAmount) - Math.abs(applyAmt),
        different: subtotal,
        grandTotal: grandTotal,
        totaltax: totaltax,
        totalbalance: totalamount - totaltax,
        items: itemArr,
        iteminv: iteminv,
        copytext: 'ต้นฉบับ',
        copytexteng: 'Original',
        billAddress: billaddress,
        taxId: taxId,
      };

      log.debug('data', data);

      renderer.addRecord({ templateName: 'record', record: cnRecord });

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
      context.response.writeFile(generateXml(arrFileId), true);
      file.delete({
        id: fileId,
      });
      file.delete({
        id: fileId2,
      });

      //context.response.writeFile(renderer.renderAsPdf(),true);
    } catch (err) {
      log.debug('error@onRequest', err + ' line ' + err.lineNumber);
    }
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
      type: 'employee',
      filters: [['internalid', 'anyof', setby]],
      columns: [search.createColumn({ name: 'supervisor', label: 'Supervisor' })],
    });
    var supervisor = '';
    employeeSearchObj.run().each(function (result) {
      // .run().each has a limit of 4,000 results
      supervisor = result.getText(employeeSearchObj.columns[0]);
      return true;
    });

    //  log.debug("setby + supervisor", setby + ' ' + supervisor)
    return supervisor;
  }

  function getRecordType(recordId) {
    var recTypeLookup = search.lookupFields({
      type: search.Type.TRANSACTION,
      id: recordId,
      columns: 'recordtype',
    });
    return recTypeLookup.recordtype;
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

  function isEmptyObj(obj) {
    return Object.keys(obj).length === 0;
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

  function usdToText(amount) {
    const US_DIGITS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const US_TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const US_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const US_UNITS = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion'];

    function convertLessThanOneThousand(number) {
      var text = '';

      if (number % 100 < 10) {
        text += US_DIGITS[number % 10];
        number = Math.floor(number / 10);
      } else if (number % 100 < 20) {
        text += US_TEENS[number % 10];
        number = Math.floor(number / 100);
      } else {
        text += US_DIGITS[number % 10];
        number = Math.floor(number / 10);

        text = US_TENS[number % 10] + (text ? '-' + text : '');
        number = Math.floor(number / 10);
      }

      if (number === 0) return text;
      return US_DIGITS[number] + ' hundred' + (text ? ' ' + text : '');
    }

    function usdToTextRecursive(number, unitIndex) {
      if (number === 0) return '';

      const chunk = number % 1000;
      const chunkText = convertLessThanOneThousand(chunk);

      if (chunkText) {
        return usdToTextRecursive(Math.floor(number / 1000), unitIndex + 1) + ' ' + chunkText + (unitIndex > 0 ? ' ' + US_UNITS[unitIndex] : '');
      }

      return usdToTextRecursive(Math.floor(number / 1000), unitIndex + 1);
    }

    if (amount === 0) {
      return 'zero baht';
    }

    const dollars = Math.floor(amount);
    const cents = Math.round((amount - dollars) * 100);

    var text = '';
    if (dollars > 0) {
      text += usdToTextRecursive(dollars, 0) + ' baht';
      if (dollars !== 1) {
        text += ' ';
      }
    }

    if (cents > 0) {
      text += ' and ' + convertLessThanOneThousand(cents) + ' satang';
      if (cents !== 1) {
        text += '';
      }
    }

    return text;
  }

  function isEmpty(str) {
    return !str || 0 === str.length;
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

  function testWhite(x) {
    var white = new RegExp(/^\s$/);
    return white.test(x.charAt(0));
  }

  return {
    onRequest: onRequest,
  };
});
