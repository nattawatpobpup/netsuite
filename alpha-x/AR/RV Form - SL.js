  /**
   * @NApiVersion 2.0
   * @NScriptType Suitelet
   * @NModuleScope SameAccount
   */
  /*******************************************************************************
   * CLIENTNAME:PP
   * Print RV
   * **************************************************************************
   * Date : 30-04-2022
   *
   * Author: SP
   * Script Description : Print RV
   *
   *
   * REVISION HISTORY
   *
   * Revision 1.0 ${30-04-2022} SP : created
   ******************************************************************************/
  define(['N/file', 'N/render', 'N/record', 'N/search', 'N/config'], function (file, render, record, search, config) {
    var TEMPLATE = './RV.xml';
    function onRequest(context) {
      try {
        var renderer = render.create();
        var rvRecord = record.load({ type: 'customerpayment', id: context.request.parameters.recId });

        renderer.templateContent = file.load(TEMPLATE).getContents();

        var companyInfo = config.load({
          type: config.Type.COMPANY_INFORMATION,
        });
        var logoFile = companyInfo.getValue('formlogo');

        var fileObj = file.load({
          id: logoFile,
        });

        var custg = rvRecord.getText('csegskr_cust_group');
        if (!isEmpty(custg)) {
          custg = custg.substr(0, custg.indexOf(' '));
        }

        var lineCount = rvRecord.getLineCount({
          sublistId: 'apply',
        });
        var countApply = 0;
        var invoiceId = 0;
        var patientName = '';

        for (var i = 0; i < lineCount; i++) {
          var applyFlag = rvRecord.getSublistValue({
            sublistId: 'apply',
            fieldId: 'apply',
            line: i,
          });
          if (applyFlag) {
            invoiceId = rvRecord.getSublistValue({
              sublistId: 'apply',
              fieldId: 'internalid',
              line: i,
            });
            countApply++;
          }
        }

        if (countApply == 1) {
          ///LOAD invoiceId
          var invoiceRec = record.load({
            type: 'invoice',
            id: invoiceId,
          });

          patientName = invoiceRec.getValue('custbody_skh_hn_name');
        }
        if (countApply == 0) {
          context.response.write({
            output: 'ไม่มีรายการ Invoice ที่รับชำระ',
          });
        }

        renderer.addRecord({ templateName: 'record', record: rvRecord });

        var internalIdArr = [];
        internalIdArr.push(context.request.parameters.recId);
        log.debug('internal', context.request.parameters.recId);
        var glLines = getGlImpact(context.request.parameters.recId);

        var internalIdbill = [];
        internalIdbill.push(context.request.parameters.recId);
        var billLines = getbillitem(internalIdbill);

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
        companyaddress: wordWrap(comAddress,60),
        tel: tel,
        fax: fax, 
        vatno: vatno,
      };
  
        log.debug('companyInfo', companyInfo);
  

        var customerId = rvRecord.getValue('customer');
        var addressId = rvRecord.getValue('billaddresslist');
        var customerAddress;
        if (!isEmpty(addressId)) customerAddress = getCustomerAddressById(customerId, addressId);
        else {
          customerAddress = getCustomerBillAddress(customerId);
        }

        log.debug('customerAddress', customerAddress);

        if (!isEmpty(customerAddress)) {
          var billAddress1 = customerAddress.getValue('addr1');
          var billAddress2 = customerAddress.getValue('addr2');
          var billAddress3 = customerAddress.getValue('addr3');
          var billCity = customerAddress.getValue('city');
          var billState = customerAddress.getValue('state');
          var billCountry = customerAddress.getValue('country');
          var billzip = customerAddress.getValue('zip');

          billAddress1 = billAddress1 + ' ' + billAddress2 + ' ' + billAddress3;
          billAddress2 = billCity + ' ' + billState + ' ' + billzip;

          var billAddress = escape_for_xml(billAddress1 + ' ' + billAddress2);
          billAddress = wordWrap(billAddress, 70);
        } else {
          ('');
        }

        var userName = getCreatedPerson(context.request.parameters.recId);
        var wht = rvRecord.getValue('custbody_ice_ar_whtamount');

        var totalCredit = glLines.totalCredit        
        var arrNumber = glLines.totalCredit.toString().split('.');
        var numberWords = numberToEnglish(arrNumber[0]);
        if (arrNumber.length > 1) {
          if (parseInt(arrNumber[1]) > 0) {
            numberWords = numberWords + ' and ' + parseInt(arrNumber[1]).toString() + '/100';
          }
        }

        var totaleng = numberWords;
        var totalthai = BAHTTEXT(totalCredit);

        var appName = getApprovedPerson(context.request.parameters.recId);

        if (glLines.accgl.length > 0) {
          var data = {
            glLines: glLines.accgl,
            appName:appName,
            billLines: billLines.billitem,
            logoUrl: escape_for_xml(fileObj.url),
            billAddress: billAddress,
            userName: removeDuplicates(userName),
            wht: wht,
            totalCredit: glLines.totalCredit,
            totalDebit: glLines.totalDebit,
            totaleng:totaleng,
            totalthai:totalthai,
            rvamount : glLines.rvamount,
          };
          log.debug('data', data);
          log.debug('glLines', glLines);
          log.debug('billLines', billLines);

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

          context.response.writeFile(renderer.renderAsPdf(), true);
        } else {
          context.response.write(' None GL Impact');
        }
      } catch (err) {
        log.debug('error@onRequest', err + " linenum " + err.lineNumber);
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

    function testWhite(x) {
      var white = new RegExp(/^\s$/);
      return white.test(x.charAt(0));
    }

    function parseNumber(val) {
      var parsed = parseFloat(val);
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

    function getbillitem(paymentId) {
      var customerpaymentSearchObj = search.create({
        type: 'transaction',
        filters: [['payingtransaction.internalid', 'anyof', paymentId], 'AND', ['mainline', 'is', 'T'], 'AND', ['applyingtransaction', 'is', 'Payment']],
        columns: [
          search.createColumn({
            name: 'internalid',
            label: 'internalid',
          }),
        ],
      });

      var inv = [];
      customerpaymentSearchObj.run().each(function (result) {
        var internalid = result.getValue(customerpaymentSearchObj.columns[0]);

        inv.push(internalid);
        log.debug('internalid', internalid);
        return true;
      });

      var transactionSearchObj = search.create({
        type: 'transaction',
        filters: [
          ["applyingtransaction","anyof",paymentId], 
          "AND", 
          ["applyinglinktype","anyof","Payment"], 
          "AND", 
          ["mainline","is","T"], 
          "AND", 
          ["applyinglinkamount","greaterthan","0.00"], 
          "AND", 
          ["applyingtransaction.type","anyof","CustPymt"], 
          "AND", 
          ["payingtransaction.type","anyof","CustPymt"]
        ],
        columns: [

          search.createColumn({name: "tranid", label: "Document Number"}),
          search.createColumn({name: "trandate", label: "Date"}),
          search.createColumn({name: "memo", label: "Memo"}),
          search.createColumn({
            name: "formulacurrency",
            formula: "{amount} - nvl({taxtotal},0) - nvl({shippingamount},0)",
            label: "subtotal"
          }),
          search.createColumn({name: "taxtotal", label: "Amount (Transaction Tax Total)"}),
          search.createColumn({name: "amount", label: "Amount"})
          ]
          // search.createColumn({ name: 'trandate', label: 'Date' }),
          // search.createColumn({
          //   name: 'formulatext',
          //   formula: '{tranid}',
          //   label: 'tranid',
          // }),
          // search.createColumn({
          //   name: 'formulacurrency',
          //   formula: '{amount}',
          //   label: 'amt',
          // }),
          // search.createColumn({
          //   name: 'amount',
          //   join: 'applyingTransaction',
          //   label: 'billamt',
          // }),
          // search.createColumn({
          //   name: 'formulatext',
          //   formula:
          //     "case when {applyingtransaction.type} = 'Payment' then {tranid} when {applyingtransaction.type} = 'Deposit Application' then {applyingtransaction.createdfrom} else {applyingtransaction.tranid} end",
          //   label: 'refnumber',
          // }),
          // search.createColumn({
          //   name: 'formulacurrency',
          //   formula:
          //     "case when {applyingtransaction.type} = 'Payment' then abs({applyinglinkamount}) when {applyingtransaction.type} = 'Deposit Application' then abs({applyingtransaction.amount}) when {applyingtransaction.type} = 'Credit Memo' then abs({applyinglinkamount}) else abs({applyingtransaction.amount}) end",
          //   label: 'lastamt',
          // }),
          // search.createColumn({ name: 'memomain', label: 'memo' }),
          // search.createColumn({
          //   name: 'formulacurrency',
          //   formula:
          //     "case when {applyingtransaction.type} = 'Credit Memo' then abs({applyingtransaction.amount}) when {applyingtransaction.type} = 'Deposit Application' then abs({applyingtransaction.amount}) else abs({applyinglinkamount}) END",
          //   label: 'oriamt',
          // }),
          // search.createColumn({
          //   name: 'formulatext',
          //   formula:
          //     "case when {applyingtransaction.type} = 'Payment' then 'Invoice' when {applyingtransaction.type} = 'Deposit Application' then 'Credit Memo' when {applyingtransaction.type} = 'Credit Memo' then 'Credit Memo' else {applyingtransaction.type} end",
          //   label: 'Type',
          // }),
          // search.createColumn({
          //   name: 'internalid',
          //   label: 'Internal ID' }),

          // search.createColumn({
          //   name: 'formulacurrency',
          //   formula:
          //     "case when {applyingtransaction.type} = 'Deposit Application' then abs({applyinglinkamount}) when {applyingtransaction.type} = 'Credit Memo' then abs({applyinglinkamount}) else 0 end",
          //   label: 'sumamt',
          // }),
          // search.createColumn({ 
          //   name: 'payingamount',
          //   label: 'Paying Amount' }),
        // ],
      });
      

      var billitem = [];
      transactionSearchObj.run().each(function (result) {
        // for (var i = 0; i < transactionSearchObj.columns.length; i++) 
        // itemLine[searchColumns[i].label] = result.getValue(searchColumns[i]);
        var tranid = result.getValue(transactionSearchObj.columns[0]);
        var Date = result.getValue(transactionSearchObj.columns[1]);
        var memo = result.getValue(transactionSearchObj.columns[2]);
        var subtotal = result.getValue(transactionSearchObj.columns[3]);
        var tax = result.getValue(transactionSearchObj.columns[4]);
        var amount = result.getValue(transactionSearchObj.columns[5]);

        // var vat = Math.abs(amount)*0.07;
        // var total = Math.abs(subtotal)+vat;

        // var Date = result.getValue(transactionSearchObj.columns[0]);
        // var tranid = result.getValue(transactionSearchObj.columns[1]);
        // var amt = result.getValue(transactionSearchObj.columns[2])  
        // var billamt = result.getValue(transactionSearchObj.columns[3]);
        // var refnumber = result.getValue(transactionSearchObj.columns[4]);
        // var lastamt = result.getValue(transactionSearchObj.columns[5]);
        // var memo = result.getValue(transactionSearchObj.columns[6]);
        // var oriamt = result.getValue(transactionSearchObj.columns[7]);
        // var type = result.getValue(transactionSearchObj.columns[8]);
        // var intid = result.getValue(transactionSearchObj.columns[9]);
        // var sumamt = result.getValue(transactionSearchObj.columns[10]);
        // var amount = result.getValue(transactionSearchObj.columns[11]);


        /* sumamt=parseNumber(sumamt);
            totalamt+=sumamt;*/

        // if (refnumber.indexOf('#') > -1) {
        //   pos = refnumber.indexOf('#');
        //   refnumber = refnumber.substring(pos + 1);
        // }
        // var applyamt = 0;
        // if (type == 'Invoice') {
        //   applyamt = sumamt;
        // }

        billitem.push({
          tranid: tranid,
          Date: Date,
          memo: escape_for_xml(memo),
          // subtotal: subtotal,
          total: amount,
          vat: tax,
          amount: subtotal,
          // total: total,
          // vat: vat,

          // Date: Date,
          // tranid: tranid,
          // amt: amt,
          // billamt: billamt,
          // refnumber: refnumber,
          // lastamt: lastamt,
          // memo: escape_for_xml(memo),
          // oriamt: oriamt,
          // type: type,
          // intid: intid,
          // applyamt: applyamt,
          // sumamt: sumamt,
          // amount: amount,
        

        });
        return true;
      });
      return {
        billitem: billitem,
      };
    }

    function getGlImpact(invoiceId) {
      var transactionFilters = ['internalid', 'anyof', invoiceId];

      var transactionSearchObj = search.create({
        type: 'transaction',
        filters: [['internalid', 'anyof', invoiceId], 'AND', ['accounttype', 'noneof', '@NONE@'], 'AND', ['amount', 'notequalto', '0.00'], 'AND', ['systemnotes.type', 'is', 'T']],
        columns: [
          search.createColumn({
            name: 'formulatext',
            formula: '{account.number}',
            label: 'Formula (Text)',
          }),
          search.createColumn({
            name: 'formulatext',
            formula: '{account.name}',
            label: 'Formula (Text)',
          }),
          search.createColumn({
            name: 'formulacurrency',
            formula: '{debitamount}',
            label: 'debit',
          }),
          search.createColumn({
            name: 'formulacurrency',
            formula: '{creditamount}',
            label: 'credit',
          }),
          search.createColumn({
            name: "formulatext",
            formula: "{departmentnohierarchy}",
            label: "deptCode",
          }),
          search.createColumn({
            name: "formulatext",
            formula: "{classnohierarchy}",
            label: "classCode",
          }),
          search.createColumn({name: "accounttype", label: "Account Type"})
          
        ],
      });
      var accgl = [];
      var totalCredit=0;
      var totalDebit = 0;
      var wht = 0;
      var rvAmount = 0;
      transactionSearchObj.run().each(function (result) {
        var accountnumber = result.getValue(transactionSearchObj.columns[0]);
        var account = result.getValue(transactionSearchObj.columns[1]);
        var debit = result.getValue(transactionSearchObj.columns[2]);
        var credit = result.getValue(transactionSearchObj.columns[3]);
        var deptCode = result.getValue(transactionSearchObj.columns[4]);
        var classCode = result.getValue(transactionSearchObj.columns[5]);
        var accountType = result.getValue(transactionSearchObj.columns[6]);
        

        accgl.push({
          accountnumber: accountnumber,
          account: account,
          debit: debit,
          credit: credit,
          deptCode: deptCode,
          classCode: classCode,
        });

        if(accountType=='Bank') {
            rvAmount = rvAmount + parseNumber(debit) - parseNumber(credit)
        }
        totalCredit += (credit*1);
        totalDebit += (debit*1);

        return true;
      });

      return {
        accgl: accgl,
        totalCredit: totalCredit,
        totalDebit: totalDebit,
        rvamount : rvAmount
      };
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

    function decodeXml(string) {
      return string.replace(/(&quot;|&lt;|&gt;|&amp;|&apos;|&Oslash;)/g, function (str, item) {
        return escaped_one_to_xml_special_map[item];
      });
    }

    function encodeXml(string) {
      return string.replace(/([\&"<>'Ø])/g, function (str, item) {
        return xml_special_to_escaped_one_map[item];
      });
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

    function parseNumber(val) {
      if (isEmpty(val)) val = 0;
      var parsed = parseFloat(parseFloat(val).toFixed(2));

      return isNaN(parsed) ? 0 : parsed;
    }

    function formatCurrency(val) {
      var parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }
    function isEmpty(str) {
      return !str || 0 === str.length;
    }

    return {
      onRequest: onRequest,
    };
  });
