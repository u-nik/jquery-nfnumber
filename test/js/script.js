$(function () {
    // Wertbuttons
    $('fieldset button').on('click', function () {
        var $button = $(this);
        var data = $button.data();
        var $input = $('#' + data.id);

        if (data.method == 'get') {
            alert($input.nfNumber('value'));
        } else {
            $input.nfNumber('value', data.value);
        }
        return true;
    });

    // Handler zum Ausgegen der Formulardaten, so wie sie am Server ankämen.
    $('form').on('submit', function (e) {
        e.preventDefault();
        var obj = {}, string = "";
        $('input[name]').each(function (index, e) {
            var $e = $(e);
            var name = $e.attr('name');
            obj[name] = name + ':"' + $e.val() + '"';
        });

        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                string += obj[i] + "\n";
            }
        }
        alert(string);
    })

    var changeHandler = function (value) {
        $('#lastvalue').html(this.attr('name') + ': ' + value);
    };

    var reachHandler = function (value, invalidValue, s) {
        console.log('Reached ' + value + '. Invalid value: ' + invalidValue);
        $(this).addClass('reached');
        window.setTimeout(function ($e) {
            $e.removeClass('reached');
        }, 200, $(this));
    };

    $('button#toggle').toggle(
        function () { // Aktivieren
            $('#raw input').nfNumber({decsign:',', seperator:'.', change:changeHandler, reachmax:reachHandler, reachmin:reachHandler});
            $('#formatted input').nfNumber({decsign:',', seperator:'.', formmode:'formatted', update:changeHandler});
            $(this).html('Deaktivieren');
        },
        function () { // Deaktivieren
            $('#raw input').nfNumber('destroy');
            $('#formatted input').nfNumber('destroy');
            $(this).html('Aktivieren');
        }
    );
});