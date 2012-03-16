(function ($) {

    var defaultSettings = {
        /** @var int Genauigkeit (Anzahl Kommastellen) */
        precision:2,
        /** @var numeric Schritt bei Inkrementierung oder Dekrementierung */
        step:0,
        /** @var string Dezimaltrennzeichen */
        decsign:'.',
        /** @var string Tausendertrennzeichen */
        seperator:'',
        /** @var string Prefix */
        prefix:'',
        /** @var string Suffix */
        suffix:''
    };

    var helper = {
        /**
         * Einfache String Replace Implementation ohne RegExp.
         * @param search Zu ersetzender String
         * @param replace Ersatzstring
         * @param subj String in dem gesucht und ersetzt wird
         * @return string Fertig ersetzter String
         */
        replace:function (search, replace, subj) {
            return subj.split(search).join(replace);
        },
        /**
         * Fügt dem String 0en an den Anfang an, wenn die Länge nicht der
         * angegebenen entspricht.
         * @param string
         * @param length
         */
        prepandZeros:function(string, length) {
            while (string.length < length) {
                string = "0" + string
            }
            return string;
        }
    };

    // NFFormat Objekt.
    var nfFormat = function(settings) {

        // Einstellungen im Objekt festhalten.
        this.settings = $.extend({}, defaultSettings, settings);

        /**
         * Formatiert eine Zahl in einen String anhand des gegebenen Formates.
         * @param value Float, Double oder Integerzahl
         * @return string
         */
        this.toString = function (value) {
            var data = this.settings;
            var precision = data.precision, parts = [], part, isNegativ, string,
                fraction, number, divider = 1000;

            // Bestimmen ob Zahl negativ ist, und dann positiv machen.
            isNegativ = value < 0;
            value = Math.abs(value);

            // Get fractional numbers
            number = parseInt(value);
            if (precision > 0) {
                fraction = "" + Math.round((value - number) * Math.pow(10, precision));
                fraction = helper.prepandZeros(fraction, precision);
            }

            // ... number greater then 0
            while (number > 0) {
                part = number / divider;
                part = "" + Math.round((part - parseInt(part)) * divider);

                // prepend zeros to numberpart if necessary.
                if (number >= divider) {
                    part = helper.prepandZeros(part, 3);
                }
                parts[parts.length] = part;

                // reduce number by partsize
                number = parseInt(number / divider);
            }

            // assemble string number.
            if (parts.length == 0) {
                string = "0";
            } else {
                string = parts.reverse().join(data.seperator);
            }

            // add fraction if precision greater then 0...
            if (precision > 0) {
                string += data.decsign + fraction;
            }

            return data.prefix + (isNegativ ? "-" : "") + string + data.suffix;
        };

        /**
         * Parsed einen String in eine Zahl anhand des gegebenen Formates.
         * @param value Stringdarstellung einer Zahl
         * @return float
         */
        this.toFloat = function (value) {
            var data = this.settings;

            if (typeof value == 'string') {
                if (data.prefix != '') {
                    value = helper.replace(data.prefix, '', value);
                }

                if (data.suffix != '') {
                    value = helper.replace(data.suffix, '', value);
                }

                if (data.seperator != '' && value.indexOf(data.seperator) != -1) {
                    value = helper.replace(data.seperator, "", value);
                }

                if (data.decsign != '.' && value.indexOf(data.decsign) != -1) {
                    value = helper.replace(data.decsign, ".", value);
                }
            } else {
                value = "0";
            }

            var flt = parseFloat(value);

            // Float gefunden? Wenn ja, Float liefern, sonst 0
            if (flt == Number.NaN) {
                $.error('Invalid Number: ' + value);
                return 0;
            }

            return flt;
        };
    };

    // Hauptmethode
    $.fn.nfFormat = function (settings) {
        return new nfFormat(settings);
    };

})(jQuery);