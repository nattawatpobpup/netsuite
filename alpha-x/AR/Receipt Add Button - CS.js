define(['N/currentRecord','N/url'],
function(currentRecord,url){

    function printReceipt(){
        try{
            var scriptUrl = url.resolveScript({
            scriptId: 'customscript_simple_rec',
            deploymentId: 'customdeploy_simple_rec'
        });

        window.open(scriptUrl+"&recId="+currentRecord.get().id);

        }catch(err){
            console.log(err)
        }
    }

      function printReceiptTax(){
        try{
            var scriptUrl = url.resolveScript({
            scriptId: 'customscript_receipt',
            deploymentId: 'customdeploy_receipt'
        });

        window.open(scriptUrl+"&recId="+currentRecord.get().id+"&taxinvoice=Y");

        }catch(err){
            console.log(err)
        }
    }
    

    return{
        printReceipt:printReceipt,
        printReceiptTax:printReceiptTax
    }
})