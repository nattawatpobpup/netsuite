/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
/*******************************************************************************
 * CLIENTNAME:iCE
 * Print Receipt Tax
 * **************************************************************************
 * Date : 08-09-2022
 *
 * Author: SP
 * Script Description : Print Receipt Tax
 *
 *
 * REVISION HISTORY
 *
 * Revision 1.0 ${30-09-2022} SP : created
 ******************************************************************************/
define(['N/file', 'N/render', 'N/record', 'N/search', 'N/config', 'N/runtime', 'N/xml'], function (file, render, record, search, config, runtime, mxml) {
  var TEMPLATE = './rec.xml';
  function onRequest(context) {
    try {
      var renderer = render.create();

      var paymentRecord = record.load({ type: 'customerpayment', id: context.request.parameters.recId });

        //oneworld
        var userPreference = config.load({
            type: config.Type.USER_PREFERENCES
        });

        var compId;
        var companyRec;
        var logosub;
        var compName;
        var taxID;
        var subsidiary = userPreference.getFields();
        if(subsidiary.indexOf('SUBSIDIARY') > -1) {
                log.debug('OneWorld','OneWorld');
                compId = paymentRecord.getValue('subsidiary');
                companyRec = record.load({
                    type : "subsidiary",
                    id : compId
                });
                logosub = companyRec.getValue("logo");
                compName = companyRec.getValue('legalname');
                taxID = companyRec.getValue('federalidnumber');
        } else {
            log.debug('NotOneWorld','NotOneWorld');
            compId = 1;
            companyRec = config.load({
                type: config.Type.COMPANY_INFORMATION
            }); 
            logosub = companyRec.getValue("formlogo");
            compName = companyRec.getValue('legalname');
            taxID = companyRec.getValue('employerid');
        }

        var logoUrl;
        if(!isEmpty(logosub)){
            var fileObj = file.load({
                id: logosub
            });  
            if(!isEmptyObj(fileObj))
                logoUrl = escape_for_xml(fileObj.url)
        }      

      var addrRec = companyRec.getSubrecord('mainaddress');
      var comAddress1 = addrRec.getValue('addr1');
      var comAddress2 = addrRec.getValue('addr2');
      var comAddress3 = addrRec.getValue('addr3');
      var comCity = addrRec.getValue('city');
      var comState = addrRec.getValue('state');
      var comzip = addrRec.getValue('zip');
      var tel = addrRec.getValue('addrphone');
      var fax = companyRec.getValue('fax');

      var comAddress1 = comAddress1 + ' ' + comAddress2 + ' ' + comAddress3;
      var comAddress2 = comCity + ' ' + comState + ' ' + comzip;

      var comAddress = comAddress1 + ' ' + comAddress2;

      companyInfo = {
        companyname: compName,
        companyaddress: comAddress,
        tel: tel,
        fax: fax, 
        vatno: taxID,
        logourl : logoUrl
      };

      var customerId = paymentRecord.getValue('customer');
      var addressId = paymentRecord.getValue('billaddresslist');
      var customerAddress;
      if (!isEmpty(addressId)) customerAddress = getCustomerAddressById(customerId, addressId);
      else {
        customerAddress = getCustomerBillAddress(customerId);
      }

      log.debug('customerAddress', customerAddress);

      if (!isEmpty(customerId)) customerAddress = getCustomerBillAddress(customerId);

      log.debug('customerAddress2', customerAddress);
      
      if (!isEmpty(customerAddress)) {
        var billName = customerAddress.getValue('addressee');
        var billAddress1 = customerAddress.getValue('addr1');
        var billAddress2 = customerAddress.getValue('addr2');
        var billAddress3 = customerAddress.getValue('addr3');
        var billCity = customerAddress.getValue('city');
        var billState = customerAddress.getValue('state');
        var billZip = customerAddress.getValue('zip');
        var billPhone = customerAddress.getValue('custrecord_ar_customer_tel');
      }

      billAddress1 = billAddress1 + ' ' + billAddress2;
      billAddress2 = billAddress3 + ' ' + billCity + ' ' + billState + ' ' + billZip;

      var billAddress = escape_for_xml(billAddress1 + ' ' + billAddress2);
       billAddress = wordWrap(billAddress, 80);

      log.debug('billAddress', billAddress);
      
      var invArr = [];
      var grandtotal = 0;
      var prevat = 0;
      var vatTotal = 0;
      var transactionSearchObj = search.create({
        type: 'transaction',
        filters: [['payingtransaction', 'anyof', context.request.parameters.recId], 'AND', ['mainline', 'is', 'T'], 'AND', ['taxline', 'is', 'F']],
        columns: [
          search.createColumn({ name: 'tranid', label: 'InvoiceNo' }),
          search.createColumn({ name: 'internalid', label: 'intid' }),
          search.createColumn({name: "total", label: "Amount (Transaction Total)"}),
          search.createColumn({ name: 'trandate', label: 'Date' }),
          search.createColumn({name: "taxtotal", label: "Amount (Transaction Tax Total)"}),
          search.createColumn({ name: 'memo', label: 'Memo'}),
        ],
      });

      var itemArr = [];
      var invArr = [];
      transactionSearchObj.run().each(function (result) {
        var InvoiceNo = result.getValue(transactionSearchObj.columns[0]);
        var intid = result.getValue(transactionSearchObj.columns[1]);
        var amount = result.getValue(transactionSearchObj.columns[2]);
        var date = result.getValue(transactionSearchObj.columns[3]);
        var tax = result.getValue(transactionSearchObj.columns[4]);
        var memo = result.getValue(transactionSearchObj.columns[5]);

        vatTotal += parseNumber(tax);
        grandtotal += parseNumber(amount);
        var total = parseNumber(amount) - parseNumber(tax);
        prevat += total;
        date = date.split('/').join('.');

        itemArr.push({
          invoice: InvoiceNo,
          amount: total,
          tax: tax,
          total: parseNumber(amount),
          date:date,
          description: memo,
        });

        invArr.push(intid);

        log.debug('intid', intid);

        log.debug('itemArr', itemArr);
        return true;
      });

      log.debug('invArr', invArr);

      if (invArr.length > 0) {


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

        var arrNumber = grandtotal.toFixed(2).toString().split('.');
        var numberWords = numberToEnglish(arrNumber[0]);
        if (arrNumber.length > 1) {
          if (parseInt(arrNumber[1]) > 0) {
            numberWords = numberWords + ' and ' + parseInt(arrNumber[1]).toString() + '/100';
          }
        }
        var grandTotalEng = numberWords;
        var totalword = BAHTTEXT(grandtotal);

        var appName = getApprovedPerson(context.request.parameters.recId);

        renderer.addRecord({ templateName: 'record', record: paymentRecord });

        var customForm = paymentRecord.getText('customform');
        var formName = 'Receipt';
        if(customForm.toLowerCase().indexOf('service')>-1) {
          formName = 'Tax Receipt';
        } 

        var data = {
          appName:appName,
          formname : formName,
          BillAddress: billAddress,
          //logoUrl: escape_for_xml(fileObj.url),
          //iteminv: iteminv,
          itemArr: itemArr,
          prevat: prevat,
          vatTotal: vatTotal,
          grandtotal: grandtotal,
          totaleng: wordWrap(grandTotalEng,55),
          totalword: wordWrap(totalword,55),
          copytext: 'ต้นฉบับ',
          copytexteng: 'Original'
        };

        log.debug('data', data);

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
        context.response.writeFile(generateXml(arrFileId), true);
        file.delete({
          id: fileId,
        });
        file.delete({
          id: fileId2,
        });

        //context.response.writeFile(renderer.renderAsPdf(),true);
      } else {
        context.response.write('None Invoice Apply');
      }
    } catch (err) {
      log.debug('error@onRequest', err);
    }
  }

  function getRecordType(recordId) {
    var recTypeLookup = search.lookupFields({
      type: search.Type.TRANSACTION,
      id: recordId,
      columns: 'recordtype',
    });
    return recTypeLookup.recordtype;
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

  function parseNumber(val) {
    var parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }

  function isEmptyObj(obj) {
    return Object.keys(obj).length === 0;
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
  function testWhite(x) {
    var white = new RegExp(/^\s$/);
    return white.test(x.charAt(0));
  }

  return {
    onRequest: onRequest,
  };
});
