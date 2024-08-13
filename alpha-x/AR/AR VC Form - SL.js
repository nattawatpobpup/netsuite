/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
/*******************************************************************************
 * CLIENTNAME:PP
 * Print AR Invoice Voucher
 * **************************************************************************
 * Date : 15-01-2022
 *
 * Author: SP
 * Script Description : Print AR Invoice Voucher
 *
 *
 * REVISION HISTORY
 *
 * Revision 1.0 ${15-01-2022} SP : created
 ******************************************************************************/
define(['N/file', 'N/render', 'N/record', 'N/search', 'N/config'], function (file, render, record, search, config) {
  var TEMPLATE = './AR VC.xml';
  function onRequest(context) {
    try {
      var renderer = render.create();

      var arInvoice = record.load({ type: 'invoice', id: context.request.parameters.recId });

      var accountId = arInvoice.getValue('account');

      var accountRecord = record.load({ id: accountId, type: 'account' });

      var userName = getCreatedPerson(context.request.parameters.recId);

      var appName = getApprovedPerson(context.request.parameters.recId);

      var soId = arInvoice.getValue('createdfrom');

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
        companyaddress: wordWrap(comAddress,50),
        tel: tel,
        fax: fax, 
        vatno: vatno,
      };

      log.debug('companyInfo', companyInfo);

      var glImpactId = [];
      glImpactId.push(context.request.parameters.recId);
      if (!isEmpty(soId)) {
        var soRecord = record.load({ type: 'salesorder', id: soId });
        if (!isEmptyObj(soRecord)) {
          var lineCount = soRecord.getLineCount({
            sublistId: 'links',
          });

          for (i = 0; i < lineCount; i++) {
            var linkType = soRecord.getSublistValue({
              sublistId: 'links',
              fieldId: 'type',
              line: i,
            });
            if (linkType.toLowerCase() == 'item fulfillment') {
              var linkId = soRecord.getSublistValue({
                sublistId: 'links',
                fieldId: 'id',
                line: i,
              });

              glImpactId.push(linkId);
            }
          }
        }
      }

      //log.debug('glImpactId',glImpactId);
      //var glLines = getGlImpact(context.request.parameters.recId);
      var glLines = getGlImpact(glImpactId);

      var sortGl = glLines.invGls.sort(function (a, b) {
        return a.debitamount < b.debitamount ? 1 : a.debitamount > b.debitamount ? -1 : 0;
      });

      
      var totalCredit = glLines.totalCredit;
      var arrNumber = parseNumber(totalCredit.replace(/,/g, "")).toString().split(".");
      var numberWords = numberToEnglish(arrNumber[0]);
      if (arrNumber.length > 1) {
        if (parseInt(arrNumber[1]) > 0) {
          numberWords = numberWords + " and " + parseInt(arrNumber[1]).toString() + "/100";
        }
      }
      var totaleng = numberWords;
      var totalthai = BAHTTEXT(totalCredit);

      renderer.addRecord({ templateName: 'account', record: accountRecord });
      renderer.templateContent = file.load(TEMPLATE).getContents();
      renderer.addRecord({ templateName: 'record', record: arInvoice });

      data = {
        glLines: sortGl,
        totalDebit: glLines.totalDebit,
        totalCredit: glLines.totalCredit,
        logoUrl: escape_for_xml(fileObj.url),
        userName: removeDuplicates(userName),
        appName: appName,
        totaleng:totaleng,
        totalthai:totalthai,
        //setby : setby
      };

      renderer.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: 'data',
        data: data,
      });
      log.debug('glLines', glLines);
      log.debug('data', data);

      renderer.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: 'company',
        data: companyInfo,
      });

      //Adjust to support batch print
      if (!isEmpty(context.request.parameters.batchid) && !isEmpty(context.request.parameters.folderid)) {
        //Batch Print
        var filePdf = renderer.renderAsPdf();
        filePdf.name = context.request.parameters.batchid + '_' + context.request.parameters.recId + '.pdf';
        filePdf.folder = context.request.parameters.folderid;
        filePdf.isOnline = true;
        var fileBatchId = filePdf.save();
        log.debug('fileBatchId', fileBatchId);
        context.response.write('fileid:' + fileBatchId);
      } else {
        //Normal Print
        context.response.writeFile(renderer.renderAsPdf(), true);
      }
      ////
    } catch (err) {
      log.debug('error@onRequest', err);
    }
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

    var and = custom_join_character || "and";

    /* Is number zero? */
    if (parseInt(string) === 0) {
      return "zero";
    }

    /* Array of units as words */
    units = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];

    /* Array of tens as words */
    tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

    /* Array of scales as words */
    scales = [
      "",
      "thousand",
      "million",
      "billion",
      "trillion",
      "quadrillion",
      "quintillion",
      "sextillion",
      "septillion",
      "octillion",
      "nonillion",
      "decillion",
      "undecillion",
      "duodecillion",
      "tredecillion",
      "quatttuor-decillion",
      "quindecillion",
      "sexdecillion",
      "septen-decillion",
      "octodecillion",
      "novemdecillion",
      "vigintillion",
      "centillion",
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
      return "";
    }

    /* Stringify each integer in each chunk */
    words = [];
    for (i = 0; i < chunksLen; i++) {
      chunk = parseInt(chunks[i]);

      if (chunk) {
        /* Split chunk into array of individual integers */
        ints = chunks[i].split("").reverse().map(parseFloat);

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
          words.push(word + " hundred");
        }
      }
    }

    return words.reverse().join(" ");
  }

  function getCreatedPerson(internalId) {
    var transactionSearchObj = search.create({
      type: 'transaction',
      filters: [['internalid', 'anyof', internalId], 'AND', ['mainline', 'is', 'T']],
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

    return createName;
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

  function isEmptyObj(obj) {
    return Object.keys(obj).length === 0;
  }

  function isEmpty(str) {
    return !str || 0 === str.length;
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

  function parseNumber(val) {
    var parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }

  function escape_for_xml(argument) {
    try {
      if (argument != '' && argument != null) {
        argument = argument.replace(/&/g, '&amp;');
        argument = argument.replace(/</g, '&lt;');
        argument = argument.replace(/>/g, '&gt;');
        argument = argument.replace(/"/g, '&quot;');
        argument = argument.replace(/'/g, '&apos;');
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

  function getGlImpact(invoiceId) {
    var transactionFilters = [['internalid', 'anyof', invoiceId]];

    var transactionSearchObj = search.create({
      type: 'transaction',
      filters: [['accounttype', 'noneof', '@NONE@'], 'AND', ['amount', 'notequalto', '0.00'], 'AND', ['hasnullamount', 'is', 'F'], 'AND', transactionFilters],
      columns: [
        search.createColumn({
          name: 'formulatext',
          summary: 'GROUP',
          formula: '{account.number}',
          label: 'accountnumber',
        }),
        search.createColumn({
          name: 'formulatext',
          summary: 'MAX',
          formula: '{account.name}',
          label: 'account',
        }),
        search.createColumn({
          name: 'formulatext',
          summary: 'GROUP',
          formula: '{classnohierarchy}',
          label: 'classCode',
        }),
        search.createColumn({
          name: 'formulatext',
          summary: 'GROUP',
          formula: '{departmentnohierarchy}',
          label: 'deptCode',
        }),
        search.createColumn({
          name: 'trandate',
          summary: 'MAX',
          label: 'trandate',
        }),
        search.createColumn({
          name: 'transactionnumber',
          summary: 'MAX',
          label: 'transactionnumber',
        }),
        search.createColumn({
          name: 'formulatext',
          summary: 'MAX',
          formula: '{tranid}',
          label: 'tranid',
        }),
        search.createColumn({
          name: 'linesequencenumber',
          summary: 'MAX',
          label: 'linenumber',
        }),
        search.createColumn({
          name: 'formulacurrency',
          summary: 'SUM',
          formula: '{debitamount}',
          label: 'debitamount',
        }),
        search.createColumn({
          name: 'formulacurrency',
          summary: 'SUM',
          formula: '{creditamount}',
          label: 'creditamount',
        }),
        search.createColumn({
          name: 'customscript',
          summary: 'GROUP',
          label: 'CustomScript',
        }),
        search.createColumn({
          name: "formulatext",
          summary: "GROUP",
          formula: "{item}",
          label: "item"
       })
      ],
    });

    var billGls = [];
    var totalDebit = 0;
    var totalCredit = 0;
    var searchColumns = transactionSearchObj.columns;

    transactionSearchObj.run().each(function (result) {
      var billLine = {};

      for (var i = 0; i < searchColumns.length; i++) billLine[searchColumns[i].label] = result.getValue(searchColumns[i]);

      billLine.debitamount = parseNumber(billLine.debitamount);
      billLine.creditamount = parseNumber(billLine.creditamount);
      billLine.item = wordWrap(billLine.item, 20);

      totalDebit += billLine.debitamount;
      totalCredit += billLine.debitamount;

      billLine.account = billLine.account.replace(billLine.accountnumber, '').trim();

      billLine.debitamount = billLine.debitamount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');

      billLine.creditamount = billLine.creditamount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');

      billLine.account = escape_for_xml(billLine.account);

      billGls.push(billLine);

      return true;
    });

    return {
      invGls: billGls,
      totalCredit: parseNumber(totalCredit)
        .toFixed(2)
        .replace(/\d(?=(\d{3})+\.)/g, '$&,'),
      totalDebit: parseNumber(totalDebit)
        .toFixed(2)
        .replace(/\d(?=(\d{3})+\.)/g, '$&,'),
    };
  }

  return {
    onRequest: onRequest,
  };
});
