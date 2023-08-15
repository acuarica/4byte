# 4byte

## Prerequisites

Dataset must be downloaded from <https://huggingface.co/datasets/Zellic/smart-contract-fiesta>.

```console
git lfs install
git clone https://huggingface.co/datasets/Zellic/smart-contract-fiesta
```

It is recommended to remove the `.git` directory from the dataset,
so it does not calculate _modified_ files under the dataset.

```console
rm -rf ./smart-contract-fiesta/.git
```

```console
yarn install
```

## `stats`

Displays how many contracts are in each prefix and the total number of contract source code.

```console
./stats.js
```

**Output.**

```txt
00 605 | 01 561 | 02 586 | 03 641 | 04 576 | 05 548 | 06 566 | 07 600
08 582 | 09 549 | 0a 592 | 0b 511 | 0c 571 | 0d 590 | 0e 581 | 0f 611
10 609 | 11 553 | 12 616 | 13 615 | 14 633 | 15 581 | 16 590 | 17 544
18 620 | 19 572 | 1a 616 | 1b 571 | 1c 581 | 1d 523 | 1e 543 | 1f 552
20 618 | 21 591 | 22 564 | 23 543 | 24 558 | 25 558 | 26 613 | 27 589
28 606 | 29 595 | 2a 616 | 2b 553 | 2c 544 | 2d 578 | 2e 535 | 2f 555
30 611 | 31 593 | 32 582 | 33 551 | 34 643 | 35 610 | 36 627 | 37 544
38 568 | 39 637 | 3a 580 | 3b 568 | 3c 621 | 3d 560 | 3e 579 | 3f 613
40 619 | 41 556 | 42 562 | 43 579 | 44 587 | 45 577 | 46 589 | 47 601
48 565 | 49 616 | 4a 598 | 4b 585 | 4c 598 | 4d 584 | 4e 585 | 4f 587
50 602 | 51 567 | 52 534 | 53 583 | 54 607 | 55 527 | 56 565 | 57 530
58 543 | 59 590 | 5a 574 | 5b 568 | 5c 600 | 5d 599 | 5e 597 | 5f 574
60 608 | 61 614 | 62 618 | 63 600 | 64 586 | 65 566 | 66 584 | 67 588
68 601 | 69 587 | 6a 609 | 6b 570 | 6c 579 | 6d 559 | 6e 571 | 6f 589
70 615 | 71 580 | 72 547 | 73 577 | 74 586 | 75 607 | 76 594 | 77 612
78 570 | 79 561 | 7a 561 | 7b 566 | 7c 588 | 7d 566 | 7e 636 | 7f 550
80 589 | 81 613 | 82 641 | 83 550 | 84 578 | 85 602 | 86 550 | 87 548
88 558 | 89 597 | 8a 551 | 8b 585 | 8c 576 | 8d 616 | 8e 577 | 8f 556
90 625 | 91 589 | 92 577 | 93 545 | 94 596 | 95 569 | 96 565 | 97 565
98 554 | 99 566 | 9a 597 | 9b 588 | 9c 615 | 9d 584 | 9e 570 | 9f 612
a0 571 | a1 568 | a2 618 | a3 614 | a4 560 | a5 576 | a6 627 | a7 585
a8 614 | a9 613 | aa 571 | ab 552 | ac 578 | ad 594 | ae 603 | af 605
b0 596 | b1 605 | b2 602 | b3 628 | b4 624 | b5 557 | b6 573 | b7 529
b8 564 | b9 595 | ba 567 | bb 599 | bc 556 | bd 585 | be 604 | bf 580
c0 576 | c1 591 | c2 611 | c3 583 | c4 579 | c5 606 | c6 624 | c7 600
c8 555 | c9 556 | ca 578 | cb 573 | cc 585 | cd 618 | ce 606 | cf 573
d0 619 | d1 616 | d2 647 | d3 634 | d4 644 | d5 567 | d6 503 | d7 575
d8 540 | d9 534 | da 573 | db 615 | dc 638 | dd 602 | de 591 | df 551
e0 587 | e1 559 | e2 590 | e3 556 | e4 548 | e5 609 | e6 590 | e7 595
e8 575 | e9 586 | ea 593 | eb 604 | ec 576 | ed 592 | ee 580 | ef 598
f0 554 | f1 582 | f2 560 | f3 566 | f4 545 | f5 620 | f6 583 | f7 552
f8 579 | f9 576 | fa 591 | fb 572 | fc 569 | fd 553 | fe 568 | ff 613
Total Bytecode Hashes: 149386
```

## `fetch`

Fetches all `solc` compiler versions and saves them into `.solc` folder.

```console
./fetch.js
```

**Output Excerpt.**

```txt
[...]
Total solc Versions: 101
Fetching versions...
Fetching solc v0.8.9+commit.e5eed63a 17669 contracts... cached ✓
Fetching solc v0.8.7+commit.e28d00a7 22716 contracts... cached ✓
Fetching solc v0.8.4+commit.c7e474f2 5985 contracts... cached ✓
Fetching solc v0.8.0+commit.c7dfd78e 1617 contracts... cached ✓
[...]
```

## `compile`

```console
./compile.js
```

## `abi`

```console
./abi.js
```
